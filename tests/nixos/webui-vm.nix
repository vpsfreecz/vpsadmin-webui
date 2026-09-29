{
  pkgs,
  self,
  nixpkgs,
  vpsadmin,
}:

let
  moduleResults = import ./module-eval.nix { inherit self nixpkgs vpsadmin; };
  publicHost = "newadmin.example.test";
  providerHost = "auth.example.test";
  publicOrigin = "https://${publicHost}";
  providerOrigin = "https://${providerHost}:8443";
  # A synthetic certificate and key used only by these disposable VMs.
  fixtureTls = pkgs.runCommand "vpsadmin-webui-vm-tls" { nativeBuildInputs = [ pkgs.openssl ]; } ''
    mkdir -p "$out"
    openssl req -x509 -newkey rsa:2048 -nodes -days 7 \
      -subj '/CN=${publicHost}' \
      -addext 'subjectAltName=DNS:${publicHost},DNS:${providerHost}' \
      -keyout "$out/key.pem" -out "$out/cert.pem"
  '';
  fixtureAcme = pkgs.writeTextDir "/.well-known/acme-challenge/vm-token" "vm-acme-token";
  edgeProxy = backendAddress: {
    proxyPass = "http://${backendAddress}:8080";
    recommendedProxySettings = false;
    extraConfig = ''
      proxy_set_header Host ${publicHost};
      proxy_set_header X-Forwarded-Host ${publicHost};
      proxy_set_header X-Forwarded-Proto https;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header Forwarded "";
      proxy_set_header X-Original-Forwarded-For "";
      proxy_set_header X-Client-IP "";
      proxy_set_header True-Client-IP "";
      proxy_set_header CF-Connecting-IP "";
    '';
  };
in
assert builtins.deepSeq moduleResults true;
pkgs.testers.nixosTest {
  name = "vpsadmin-webui-private-service";

  nodes = {
    edge =
      { nodes, ... }:
      let
        proxy = edgeProxy nodes.backend.networking.primaryIPAddress;
      in
      {
        networking.firewall.allowedTCPPorts = [
          80
          443
          8443
        ];
        networking.extraHosts = "127.0.0.1 ${providerHost} ${publicHost}";
        services.nginx = {
          enable = true;
          commonHttpConfig = ''
            access_log /var/log/nginx/vm-access.log combined;
            # The provider fixture records only reviewed OAuth metadata, never
            # a query, token body, cookie or authorization header.
            log_format vm_oauth_identity '$uri|$http_client_ip|$http_user_agent';
          '';
          virtualHosts.${publicHost} = {
            onlySSL = true;
            listen = [
              {
                addr = "0.0.0.0";
                port = 443;
                ssl = true;
              }
            ];
            sslCertificate = "${fixtureTls}/cert.pem";
            sslCertificateKey = "${fixtureTls}/key.pem";
            extraConfig = ''
              access_log off;
              add_header Strict-Transport-Security "max-age=86400" always;
            '';
            locations."/" = proxy;
            locations."= /oauth" = proxy // {
              extraConfig = proxy.extraConfig + "access_log off; error_log /dev/null;";
            };
            locations."^~ /oauth/" = proxy // {
              extraConfig = proxy.extraConfig + "access_log off; error_log /dev/null;";
            };
          };
          virtualHosts."${publicHost}-redirect" = {
            serverName = publicHost;
            listen = [
              {
                addr = "0.0.0.0";
                port = 80;
              }
            ];
            extraConfig = ''
              access_log off;
              error_log /dev/null;
            '';
            locations."/".extraConfig = "return 301 ${publicOrigin}$request_uri;";
            locations."^~ /.well-known/acme-challenge/" = {
              root = fixtureAcme;
              extraConfig = "try_files $uri =404;";
            };
          };
          virtualHosts.${providerHost} = {
            onlySSL = true;
            listen = [
              {
                addr = "0.0.0.0";
                port = 8443;
                ssl = true;
              }
            ];
            sslCertificate = "${fixtureTls}/cert.pem";
            sslCertificateKey = "${fixtureTls}/key.pem";
            locations."= /oauth/authorize".extraConfig = ''
              return 302 "${publicOrigin}/oauth/callback?code=vm-code-once&state=$arg_state";
            '';
            locations."= /oauth/token".extraConfig = ''
              access_log /var/log/nginx/vm-oauth-identity.log vm_oauth_identity;
              default_type application/json;
              add_header Cache-Control "no-store" always;
              return 200 '{"access_token":"vm-access-token","refresh_token":"vm-refresh-token","expires_in":3600,"token_type":"Bearer"}';
            '';
            locations."= /oauth/revoke".extraConfig = ''
              access_log /var/log/nginx/vm-oauth-identity.log vm_oauth_identity;
              default_type application/json;
              return 200 '{}';
            '';
            locations."= /oauth/recovery".extraConfig = ''
              return 200 'fixture recovery';
            '';
          };
        };
      };

    backend =
      {
        nodes,
        lib,
        pkgs,
        ...
      }:
      {
        imports = [ self.nixosModules.default ];
        environment.systemPackages = [
          pkgs.curl
          pkgs.util-linux
        ];
        networking.firewall.allowedTCPPorts = [ 8080 ];
        networking.extraHosts = "${nodes.edge.networking.primaryIPAddress} ${providerHost}";
        security.pki.certificateFiles = [ "${fixtureTls}/cert.pem" ];
        services."vpsadmin-webui" = {
          enable = true;
          publicOrigin = publicOrigin;
          api = {
            url = "${providerOrigin}/api";
            version = "7.0";
          };
          oauth = {
            authorizeUrl = "${providerOrigin}/oauth/authorize";
            tokenUrl = "${providerOrigin}/oauth/token";
            revokeUrl = "${providerOrigin}/oauth/revoke";
            passwordRecoveryUrl = "${providerOrigin}/oauth/recovery";
          };
          credentialFiles = {
            oauthClientId = "/private/vpsadmin-webui/oauth-client-id";
            oauthClientSecret = "/private/vpsadmin-webui/oauth-client-secret";
            sessionSecret = "/private/vpsadmin-webui/session-secret";
          };
          nginx = {
            listenAddress = nodes.backend.networking.primaryIPAddress;
            port = 8080;
            allowedClientAddresses = [
              "${nodes.edge.networking.primaryIPAddress}/32"
              "${nodes.backend.networking.primaryIPAddress}/32"
            ];
            trustedProxyAddresses = [ "${nodes.edge.networking.primaryIPAddress}/32" ];
          };
        };
        # Startup is controlled by the test so missing and weak credential files can
        # be checked before any session state is created.
        systemd.services."vpsadmin-webui-bff" = {
          wantedBy = lib.mkForce [ ];
          environment.NODE_EXTRA_CA_CERTS = "${fixtureTls}/cert.pem";
          serviceConfig.Restart = lib.mkForce "no";
        };
        services.nginx = {
          commonHttpConfig = lib.mkAfter ''
            log_format vm_client '$remote_addr|$vpsadmin_webui_client_ip|$http_x_forwarded_for';
          '';
          virtualHosts.${publicHost}.extraConfig = lib.mkAfter ''
            access_log /var/log/nginx/vm-client.log vm_client;
          '';
        };
      };

    client =
      { nodes, pkgs, ... }:
      {
        networking.extraHosts = "${nodes.edge.networking.primaryIPAddress} ${publicHost} ${providerHost}";
        security.pki.certificateFiles = [ "${fixtureTls}/cert.pem" ];
        environment.systemPackages = [ pkgs.curl ];
      };
  };

  testScript = { nodes, ... }: ''
    import json
    import re
    import shlex

    def request(machine, url, headers=(), cookie=None):
        args = ["curl", "--silent", "--show-error", "--max-time", "15", "--include"]
        for header in headers:
            args.extend(["-H", header])
        if cookie:
            args.extend(["-H", "Cookie: " + cookie])
        args.append(url)
        raw = machine.succeed(" ".join(shlex.quote(arg) for arg in args))
        head, body = raw.replace("\r\n", "\n").split("\n\n", 1)
        lines = head.split("\n")
        status = int(lines[0].split()[1])
        fields = {}
        for line in lines[1:]:
            if ":" in line:
                key, value = line.split(":", 1)
                fields.setdefault(key.lower(), []).append(value.strip())
        return status, fields, body

    def value(fields, key):
        return fields.get(key.lower(), [""])[-1]

    def assert_status(result, expected):
        assert result[0] == expected, result[0]
        return result

    def nginx_cursor(machine):
        lines = machine.succeed(
            "journalctl -u nginx.service --no-pager --show-cursor -n 1"
        ).splitlines()
        cursors = [line.removeprefix("-- cursor: ") for line in lines if line.startswith("-- cursor: ")]
        assert len(cursors) == 1, "nginx journal cursor unavailable"
        return cursors[0]

    def nginx_journal_after(machine, cursor):
        return machine.succeed(
            "journalctl -u nginx.service --no-pager -o cat --after-cursor " + shlex.quote(cursor)
        )

    def assert_nginx_markers_absent(machine, cursor, markers):
        journal = nginx_journal_after(machine, cursor)
        machine.succeed("test -d /var/log/nginx")
        for marker in markers:
            assert marker not in journal, "OAuth marker reached nginx journal"
            result, _ = machine.execute(
                "grep -R -F -q -- " + shlex.quote(marker) + " /var/log/nginx"
            )
            assert result == 1, "OAuth marker reached nginx file or log scan failed"

    start_all()
    edge.wait_for_unit("nginx.service")
    backend.wait_for_unit("nginx.service")
    edge.succeed("${nodes.edge.systemd.services.nginx.serviceConfig.ExecStart} -t")
    backend.succeed("${nodes.backend.systemd.services.nginx.serviceConfig.ExecStart} -t")
    backend_start_cursor = nginx_cursor(backend)

    # A synthetic legacy PHP tree must not be re-owned or modified by BFF
    # StateDirectory setup, including after a restart.
    backend.succeed("install -d -m 0750 /var/lib/vpsadmin/webui")
    backend.succeed("printf 'legacy-fixture-content\\n' > /var/lib/vpsadmin/webui/sentinel")
    backend.succeed("chmod 0640 /var/lib/vpsadmin/webui/sentinel")
    legacy_before = backend.succeed(
        "stat -c '%U:%G %a' /var/lib/vpsadmin/webui /var/lib/vpsadmin/webui/sentinel"
        " && sha256sum /var/lib/vpsadmin/webui/sentinel"
    )

    backend.fail("systemctl start vpsadmin-webui-bff.service")
    backend.fail("test -e /var/lib/vpsadmin-webui/sessions/session")
    backend.succeed("systemctl reset-failed vpsadmin-webui-bff.service")
    backend.succeed("install -d -m 0700 /private /private/vpsadmin-webui")
    backend.succeed("printf 'vm-client\\n' > /private/vpsadmin-webui/oauth-client-id")
    backend.succeed("printf 'too-short\\n' > /private/vpsadmin-webui/oauth-client-secret")
    backend.succeed("printf 'too-short\\n' > /private/vpsadmin-webui/session-secret")
    backend.succeed("chmod 0600 /private/vpsadmin-webui/*")
    # Type=simple can report start success before Node rejects weak secrets.
    backend.execute("systemctl start vpsadmin-webui-bff.service")
    backend.wait_until_succeeds(
        "systemctl show --property=ActiveState --value vpsadmin-webui-bff.service"
        " | grep -Eq '^(inactive|failed)$'"
    )
    backend.succeed(
        "journalctl -u vpsadmin-webui-bff.service --no-pager -o cat"
        " | grep -F 'OAUTH_CLIENT_SECRET: weak or placeholder secret' >/dev/null"
    )
    backend.fail("bash -c 'exec 3<>/dev/tcp/127.0.0.1/3001' 2>/dev/null")
    backend.fail("curl --silent --max-time 3 http://127.0.0.1:3001/healthz")
    backend.succeed("systemctl reset-failed vpsadmin-webui-bff.service")
    backend.succeed("printf 'VmOnly-47f91A0bC2dE3fG4hI5jK6lM7nP8qR9s\\n' > /private/vpsadmin-webui/oauth-client-secret")
    backend.succeed("printf 'VmOnly-60aB1cD2eF3gH4iJ5kL6mN7pQ8rS9t\\n' > /private/vpsadmin-webui/session-secret")
    backend.succeed("chmod 0600 /private/vpsadmin-webui/*")
    backend.succeed("systemctl start vpsadmin-webui-bff.service")
    backend.wait_for_unit("vpsadmin-webui-bff.service")
    backend.wait_for_open_port(3001)
    backend.succeed("test \"$(stat -c '%U:%G %a' /var/lib/vpsadmin-webui)\" = 'vpsadmin-webui-bff:vpsadmin-webui-bff 700'")
    backend.succeed("test \"$(stat -c '%U:%G %a' /var/lib/vpsadmin-webui/sessions)\" = 'vpsadmin-webui-bff:vpsadmin-webui-bff 700'")
    backend.fail("runuser -u nobody -- ls /var/lib/vpsadmin-webui/sessions")
    backend.succeed("test \"$(stat -c '%a' /private/vpsadmin-webui)\" = 700")
    backend.succeed("test \"$(stat -c '%a' /private/vpsadmin-webui/oauth-client-id)\" = 600")
    backend.succeed("test \"$(stat -c '%a' /private/vpsadmin-webui/oauth-client-secret)\" = 600")
    backend.succeed("test \"$(stat -c '%a' /private/vpsadmin-webui/session-secret)\" = 600")
    backend.succeed(
        "bash -c 'pid=$(systemctl show -p MainPID --value vpsadmin-webui-bff.service); "
        "dir=$(tr \"\\0\" \"\\n\" < /proc/$pid/environ | sed -n \"s/^CREDENTIALS_DIRECTORY=//p\"); "
        "test -n \"$dir\"; "
        "for name in oauth-client-id oauth-client-secret session-secret; do "
        "test -f \"$dir/$name\" && test ! -L \"$dir/$name\" || exit 1; done'"
    )
    backend.fail(
        "tr '\\0' '\\n' < /proc/$(systemctl show -p MainPID --value vpsadmin-webui-bff.service)/environ"
        " | grep -Eq '^(OAUTH_CLIENT_ID|OAUTH_CLIENT_SECRET|SESSION_SECRET)='"
    )
    backend.fail("curl --silent --max-time 3 http://${nodes.backend.networking.primaryIPAddress}:3001/healthz")

    root = "${publicOrigin}"
    edge_http_cursor = nginx_cursor(edge)
    assert_status(request(client, "http://${publicHost}/app"), 301)
    http_oauth = assert_status(request(client, "http://${publicHost}/oauth/callback?code=vm-http-code&state=vm-http-state"), 301)
    assert value(http_oauth[1], "location").startswith(root + "/oauth/callback?code=vm-http-code&state=vm-http-state")
    acme = assert_status(request(client, "http://${publicHost}/.well-known/acme-challenge/vm-token"), 200)
    assert acme[2].strip() == "vm-acme-token"
    assert_status(request(client, "http://${publicHost}/.well-known/acme-challenge/missing?code=vm-http-error-code&state=vm-http-error-state"), 404)
    index = assert_status(request(client, root + "/"), 200)
    assert "text/html" in value(index[1], "content-type")
    assert "default-src 'self'" in value(index[1], "content-security-policy")
    assert "max-age=86400" in value(index[1], "strict-transport-security")
    assert "no-cache" in value(index[1], "cache-control")
    assert_status(request(client, root + "/app/servers"), 200)
    assert_status(request(client, root + "/assets/missing.js"), 404)
    local_config = assert_status(request(client, root + "/config.local.js"), 404)
    assert value(local_config[1], "cache-control") == "no-store"
    asset = re.search(r'/assets/[^"\s]+\.js', index[2])
    assert asset, "built frontend has no JavaScript asset"
    hashed_asset = assert_status(request(client, root + asset.group(0)), 200)
    assert "immutable" in value(hashed_asset[1], "cache-control")
    assert "default-src 'self'" in value(hashed_asset[1], "content-security-policy")

    config = assert_status(request(client, root + "/config.json"), 200)
    assert "application/json" in value(config[1], "content-type")
    assert value(config[1], "cache-control") == "no-store"
    assert value(config[1], "x-content-type-options") == "nosniff"
    assert json.loads(config[2])["schemaVersion"] == 1
    js = assert_status(request(client, root + "/config.js"), 200)
    assert "application/javascript" in value(js[1], "content-type")
    assert value(js[1], "cache-control") == "no-store"
    anonymous = assert_status(request(client, root + "/session.json", ["Sec-Fetch-Site: same-origin"]), 200)
    assert json.loads(anonymous[2])["accessToken"] is None
    assert_status(request(client, root + "/session.json", ["Sec-Fetch-Site: cross-site"]), 403)
    health = assert_status(request(client, root + "/healthz"), 200)
    assert health[2] == "ok"
    assert_status(request(client, root + "/oauth"), 404)

    # The edge discards hostile client forwarding values; backend checks the
    # socket peer and canonical Host independently.
    assert_status(request(client, root + "/config.json", [
        "Host: hostile.example.test", "X-Forwarded-Proto: http",
        "X-Forwarded-For: 198.51.100.7, 198.51.100.8"
    ]), 200)
    private = "http://${nodes.backend.networking.primaryIPAddress}:8080"
    assert_status(request(client, private + "/config.json", ["Host: ${publicHost}"]), 403)
    monitor = private
    assert_status(request(backend, monitor + "/config.json", [
        "Host: ${publicHost}", "X-Forwarded-Proto: https", "X-Forwarded-For: 198.51.100.7"
    ]), 400)
    assert_status(request(backend, monitor + "/config.json", ["Host: hostile.example.test"]), 421)
    backend.succeed("grep -F '${nodes.edge.networking.primaryIPAddress}|${nodes.client.networking.primaryIPAddress}|${nodes.client.networking.primaryIPAddress}' /var/log/nginx/vm-client.log")

    login = assert_status(request(client, root + "/oauth/login?next=%2Fapp"), 302)
    assert "${providerOrigin}/oauth/authorize" in value(login[1], "location")
    pre_cookie = value(login[1], "set-cookie")
    assert "Secure" in pre_cookie and "HttpOnly" in pre_cookie and "SameSite=Lax" in pre_cookie
    assert "Domain=" not in pre_cookie
    provider = assert_status(request(client, value(login[1], "location")), 302)
    callback_url = value(provider[1], "location")
    assert callback_url.startswith(root + "/oauth/callback?code=vm-code-once&state=")
    callback = assert_status(request(client, callback_url, [
        "Client-IP: 203.0.113.70", "X-Real-IP: 203.0.113.71",
        "X-Forwarded-For: 203.0.113.72", "User-Agent: spoofed-browser-agent",
    ], cookie=pre_cookie.split(";", 1)[0]), 302)
    auth_cookie = value(callback[1], "set-cookie").split(";", 1)[0]
    assert auth_cookie
    authenticated = assert_status(request(client, root + "/session.json", ["Sec-Fetch-Site: same-origin"], auth_cookie), 200)
    session = json.loads(authenticated[2])
    assert session["accessToken"] == "vm-access-token"
    assert session["sessionKey"] and session["sessionExpiresAt"]
    assert_status(request(client, callback_url, cookie=pre_cookie.split(";", 1)[0]), 303)
    passkey = assert_status(request(client, root + "/oauth/passkey", ["Sec-Fetch-Site: same-origin"], auth_cookie), 200)
    passkey_csp = value(passkey[1], "content-security-policy")
    assert "default-src 'none'" in passkey_csp
    assert "form-action ${providerOrigin}" in passkey_csp
    assert "default-src 'self'" not in passkey_csp
    assert "vm-access-token" in passkey[2]
    oauth_error = assert_status(request(client, root + "/oauth/error"), 400)
    assert "default-src 'none'" in value(oauth_error[1], "content-security-policy")
    assert "default-src 'self'" not in value(oauth_error[1], "content-security-policy")

    # Stop before restart: the persisted session must be loaded by one writer.
    backend_failure_cursor = nginx_cursor(backend)
    backend.succeed("systemctl stop vpsadmin-webui-bff.service")
    backend.fail("systemctl is-active --quiet vpsadmin-webui-bff.service")
    backend.fail("curl --silent --max-time 3 http://127.0.0.1:3001/healthz")
    backend_failure_markers = ["vm-backend-code", "vm-backend-state"]
    assert_status(request(client, root + "/oauth/callback?code=vm-backend-code&state=vm-backend-state"), 502)
    assert_status(request(client, root + "/healthz"), 502)
    assert "/healthz" in nginx_journal_after(backend, backend_failure_cursor), "ordinary backend error missing"
    assert_nginx_markers_absent(backend, backend_failure_cursor, backend_failure_markers)
    backend.succeed("systemctl start vpsadmin-webui-bff.service")
    backend.wait_for_unit("vpsadmin-webui-bff.service")
    backend.wait_for_open_port(3001)
    resumed = assert_status(request(client, root + "/session.json", ["Sec-Fetch-Site: same-origin"], auth_cookie), 200)
    assert json.loads(resumed[2])["accessToken"] == "vm-access-token"
    legacy_after = backend.succeed(
        "stat -c '%U:%G %a' /var/lib/vpsadmin/webui /var/lib/vpsadmin/webui/sentinel"
        " && sha256sum /var/lib/vpsadmin/webui/sentinel"
    )
    assert legacy_after == legacy_before

    edge_failure_cursor = nginx_cursor(edge)
    backend.succeed("systemctl stop nginx.service")
    backend.fail("curl --silent --max-time 3 http://${nodes.backend.networking.primaryIPAddress}:8080/healthz")
    edge_failure_markers = ["vm-edge-code", "vm-edge-state"]
    assert_status(request(client, root + "/oauth/callback?code=vm-edge-code&state=vm-edge-state"), 502)
    assert_status(request(client, root + "/healthz"), 502)
    assert "/healthz" in nginx_journal_after(edge, edge_failure_cursor), "ordinary edge error missing"
    assert_nginx_markers_absent(edge, edge_failure_cursor, edge_failure_markers)
    backend.succeed("systemctl start nginx.service")
    backend.wait_for_unit("nginx.service")
    backend.wait_until_succeeds(
        "curl --silent --show-error --fail --max-time 3"
        " -H 'Host: ${publicHost}'"
        " http://${nodes.backend.networking.primaryIPAddress}:8080/healthz >/dev/null",
        timeout=30,
    )
    assert_status(request(client, root + "/healthz"), 200)

    logout = assert_status(request(client, root + "/oauth/logout", [
        "Sec-Fetch-Site: same-origin",
    ], auth_cookie), 302)
    assert value(logout[1], "set-cookie")
    assert json.loads(assert_status(request(client, root + "/session.json", [
        "Sec-Fetch-Site: same-origin",
    ], auth_cookie), 200)[2])["accessToken"] is None
    provider_identity = edge.succeed(
        "cat /var/log/nginx/vm-oauth-identity.log"
    ).splitlines()
    assert provider_identity == [
        "/oauth/token|${nodes.client.networking.primaryIPAddress}|vpsadmin-webui",
        "/oauth/revoke|-|vpsadmin-webui",
        "/oauth/revoke|-|vpsadmin-webui",
    ], "provider OAuth identity metadata mismatch"

    assert_status(request(client, "${providerOrigin}/oauth/recovery?check=other-vhost-logged"), 200)
    edge.succeed("grep -F 'other-vhost-logged' /var/log/nginx/vm-access.log >/dev/null")
    all_markers = [
        "vm-code-once", "vm-http-code", "vm-http-state", "vm-http-error-code", "vm-http-error-state",
        "vm-access-token", *backend_failure_markers, *edge_failure_markers,
    ]
    assert_nginx_markers_absent(edge, edge_http_cursor, all_markers)
    assert_nginx_markers_absent(backend, backend_start_cursor, all_markers)
    bff_journal = backend.succeed("journalctl -u vpsadmin-webui-bff.service --no-pager -o cat")
    for marker in ["vm-code-once", "vm-access-token", "VmOnly-"]:
        assert marker not in bff_journal, "secret marker reached BFF journal"
  '';
}
