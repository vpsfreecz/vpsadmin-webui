{ self }:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  inherit (lib)
    mkEnableOption
    mkIf
    mkOption
    types
    ;
  cfg = config.services."vpsadmin-webui";
  account = "vpsadmin-webui-bff";
  # Keep the BFF outside the legacy PHP service's /var/lib/vpsadmin tree.
  stateDirectory = "vpsadmin-webui";
  statePath = "/var/lib/${stateDirectory}";
  sessionsPath = "${statePath}/sessions";
  publicAuthority =
    if isOrigin cfg.publicOrigin then
      lib.removePrefix "https://" cfg.publicOrigin
    else
      "invalid.example";
  publicHost = lib.head (lib.splitString ":" publicAuthority);
  domain = "[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+";
  originPattern = "https://${domain}(:[1-9][0-9]{0,4})?";
  ipv4Octet = "(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)";
  ipv4 = "${ipv4Octet}(\\.${ipv4Octet}){3}";
  cidr = "${ipv4}(/(3[0-2]|[12]?[0-9]))?";
  isOrigin =
    value:
    value != null
    && builtins.match originPattern value != null
    && (
      let
        parts = lib.splitString ":" (lib.removePrefix "https://" value);
      in
      lib.length parts == 1 || builtins.fromJSON (lib.elemAt parts 1) <= 65535
    );
  matchedUrlOrigin =
    pattern: value:
    let
      match = if value == null then null else builtins.match "(${originPattern})${pattern}" value;
    in
    if match == null then null else lib.head match;
  isUrl =
    value:
    let
      origin = matchedUrlOrigin "(/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?" value;
    in
    origin != null && isOrigin origin;
  isEndpoint =
    value:
    let
      origin = matchedUrlOrigin "/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+" value;
    in
    origin != null && isOrigin origin;
  isRecovery =
    value:
    let
      origin = matchedUrlOrigin "/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+(\\?client_id=[A-Za-z0-9._~%-]+)?" value;
    in
    origin != null && isOrigin origin;
  urlOrigin =
    value:
    if isUrl value || isRecovery value then
      lib.head (builtins.match "(https://[^/]+)(/.*)?" value)
    else
      null;
  providerOrigin = urlOrigin cfg.oauth.authorizeUrl;
  apiOrigin = urlOrigin cfg.api.url;
  validCidrs = values: lib.all (value: builtins.match cidr value != null) values;
  validCredentialPath =
    value:
    value != null
    && builtins.match "/[A-Za-z0-9._/-]+" value != null
    && !lib.hasInfix ".." value
    && !lib.hasInfix "//" value
    && !lib.hasPrefix "/nix/store/" value;
  validPackages =
    let
      frontend = cfg.frontendPackage.provenance or null;
      bff = cfg.bffPackage.provenance or null;
    in
    frontend != null && bff != null && frontend.buildInfo == bff.buildInfo;
  publicEnvironment = lib.filterAttrs (_: value: value != null) {
    BFF_RUNTIME_MODE = "production";
    NODE_ENV = "production";
    PUBLIC_ORIGIN = cfg.publicOrigin;
    API_URL = cfg.api.url;
    API_VERSION = cfg.api.version;
    OAUTH_AUTHORIZE_URL = cfg.oauth.authorizeUrl;
    OAUTH_TOKEN_URL = cfg.oauth.tokenUrl;
    OAUTH_REVOKE_URL = cfg.oauth.revokeUrl;
    PASSWORD_RECOVERY_URL = cfg.oauth.passwordRecoveryUrl;
    OAUTH_REDIRECT_URI =
      if cfg.publicOrigin == null then null else "${cfg.publicOrigin}/oauth/callback";
    OAUTH_SCOPE = cfg.oauth.scope;
    OAUTH_TYPE = cfg.oauth.type;
    HAVEAPI_AUTH_HEADER = cfg.haveApi.authHeader;
    HAVEAPI_META_NAMESPACE = cfg.haveApi.metaNamespace;
    LEGACY_WEBUI_URL = cfg.legacyWebuiUrl;
    SESSION_COOKIE_NAME = cfg.cookieName;
    SESSION_STORE_PATH = sessionsPath;
    PORT = toString cfg.bffPort;
  };
  staticCsp = lib.concatStringsSep "; " [
    "default-src 'self'"
    "script-src 'self' 'sha256-wyf6w6jZL1nQnvQ3z5xyWt1FnxVZMXcEAzprShSzkQY='"
    "style-src 'self' 'unsafe-inline'"
    "img-src 'self' data: https://www.openstreetmap.org"
    "font-src 'self' data:"
    "connect-src 'self' ${
      lib.concatStringsSep " " (
        [ "https://nominatim.openstreetmap.org" ]
        ++ lib.optional (apiOrigin != null) apiOrigin
        ++ cfg.security.consoleOrigins
      )
    }"
    "frame-src 'self' ${
      lib.concatStringsSep " " ([ "https://www.openstreetmap.org" ] ++ cfg.security.frameOrigins)
    }"
    "form-action 'self'"
    "frame-ancestors 'self'"
    "object-src 'none'"
    "base-uri 'self'"
  ];
  staticHeaders = ''
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Content-Security-Policy "${staticCsp}" always;
  '';
  proxyHeaders = ''
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host "${publicAuthority}";
    proxy_set_header X-Forwarded-Host "${publicAuthority}";
    proxy_set_header X-Forwarded-Proto $vpsadmin_webui_public_scheme;
    proxy_set_header X-Forwarded-For $vpsadmin_webui_client_ip;
    proxy_set_header X-Real-IP $vpsadmin_webui_client_ip;
    proxy_set_header Forwarded "";
    proxy_set_header X-Forwarded-Server "";
    proxy_set_header X-Original-Forwarded-For "";
    proxy_set_header X-Client-IP "";
    proxy_set_header True-Client-IP "";
    proxy_set_header CF-Connecting-IP "";
    proxy_read_timeout 35s;
    proxy_send_timeout 35s;
    proxy_connect_timeout 5s;
    proxy_buffering off;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
  '';
  proxyLocation = {
    proxyPass = "http://127.0.0.1:${toString cfg.bffPort}";
    recommendedProxySettings = false;
    extraConfig = proxyHeaders;
  };
  oauthProxyLocation = proxyLocation // {
    extraConfig = proxyHeaders + ''
      access_log off;
      error_log /dev/null;
      add_header Cache-Control "no-store" always;
    '';
  };
  healthProxyLocation = proxyLocation // {
    extraConfig = proxyHeaders + ''
      add_header Cache-Control "no-store" always;
    '';
  };
  staticLocation = {
    extraConfig = staticHeaders + ''
      add_header Cache-Control "no-cache" always;
      try_files $uri $uri/ /index.html;
    '';
  };
  exactStatic = {
    extraConfig = staticHeaders + ''
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    '';
  };
in
{
  options.services."vpsadmin-webui" = {
    enable = mkEnableOption "the vpsAdmin React frontend and OAuth BFF";
    frontendPackage = mkOption {
      type = types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.frontend;
      description = "Immutable public frontend package; override with a matching BFF package.";
    };
    bffPackage = mkOption {
      type = types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.bff;
      description = "Immutable OAuth BFF package; override with a matching frontend package.";
    };
    publicOrigin = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Canonical public HTTPS origin.";
    };
    api.url = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Public HaveAPI HTTPS URL.";
    };
    api.version = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "HaveAPI numeric dotted version.";
    };
    oauth.authorizeUrl = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "OAuth authorization HTTPS URL.";
    };
    oauth.tokenUrl = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "OAuth token HTTPS URL.";
    };
    oauth.revokeUrl = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "OAuth revocation HTTPS URL.";
    };
    oauth.passwordRecoveryUrl = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Provider password-recovery HTTPS URL.";
    };
    oauth.scope = mkOption {
      type = types.str;
      default = "all";
      description = "OAuth scope.";
    };
    oauth.type = mkOption {
      type = types.str;
      default = "web_server";
      description = "OAuth client type.";
    };
    legacyWebuiUrl = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Optional legacy WebUI origin.";
    };
    haveApi.authHeader = mkOption {
      type = types.str;
      default = "X-HaveAPI-OAuth2-Token";
      description = "HaveAPI OAuth header name.";
    };
    haveApi.metaNamespace = mkOption {
      type = types.str;
      default = "_meta";
      description = "HaveAPI metadata namespace.";
    };
    credentialFiles.oauthClientId = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Absolute runtime source path for the raw OAuth client ID credential.";
    };
    credentialFiles.oauthClientSecret = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Absolute runtime source path for the raw OAuth client secret credential.";
    };
    credentialFiles.sessionSecret = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Absolute runtime source path for the raw session signing secret credential.";
    };
    cookieName = mkOption {
      type = types.str;
      default = "vpsadmin_webui_session";
      description = "Host-only session cookie name.";
    };
    bffPort = mkOption {
      type = types.port;
      default = 3001;
      description = "Loopback-only OAuth BFF port.";
    };
    nginx.enable = mkOption {
      type = types.bool;
      default = true;
      description = "Serve static assets and BFF routes through private nginx.";
    };
    nginx.listenAddress = mkOption {
      type = types.str;
      default = "127.0.0.1";
      description = "Exact IPv4 address for the private nginx listener.";
    };
    nginx.port = mkOption {
      type = types.port;
      default = 80;
      description = "Private nginx listener port.";
    };
    nginx.trustedProxyAddresses = mkOption {
      type = types.listOf types.str;
      default = [ ];
      description = "Exact edge IPv4 addresses or CIDRs trusted to supply normalized forwarding headers.";
    };
    nginx.allowedClientAddresses = mkOption {
      type = types.listOf types.str;
      default = [ "127.0.0.1/32" ];
      description = "Original socket-peer IPv4 addresses or CIDRs allowed to reach private nginx.";
    };
    security.consoleOrigins = mkOption {
      type = types.listOf types.str;
      default = [ ];
      description = "Reviewed exact HTTPS or WSS console connect origins.";
    };
    security.frameOrigins = mkOption {
      type = types.listOf types.str;
      default = [ ];
      description = "Reviewed exact HTTPS frame origins.";
    };
  };

  config = mkIf cfg.enable {
    assertions = [
      {
        assertion = isOrigin cfg.publicOrigin;
        message = "services.vpsadmin-webui.publicOrigin must be one canonical HTTPS DNS origin.";
      }
      {
        assertion = isUrl cfg.api.url;
        message = "services.vpsadmin-webui.api.url must be an HTTPS URL without credentials, query or fragment.";
      }
      {
        assertion =
          cfg.api.version != null
          && builtins.match "(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(\\.(0|[1-9][0-9]*))?" cfg.api.version != null;
        message = "services.vpsadmin-webui.api.version must be a numeric dotted version.";
      }
      {
        assertion =
          isEndpoint cfg.oauth.authorizeUrl
          && isEndpoint cfg.oauth.tokenUrl
          && isEndpoint cfg.oauth.revokeUrl
          && isRecovery cfg.oauth.passwordRecoveryUrl;
        message = "services.vpsadmin-webui.oauth URLs must be credential-free HTTPS provider endpoints.";
      }
      {
        assertion =
          providerOrigin != null
          && providerOrigin == urlOrigin cfg.oauth.tokenUrl
          && providerOrigin == urlOrigin cfg.oauth.revokeUrl
          && providerOrigin == urlOrigin cfg.oauth.passwordRecoveryUrl;
        message = "services.vpsadmin-webui.oauth URLs must share one provider origin.";
      }
      {
        assertion =
          isOrigin cfg.publicOrigin
          && apiOrigin != cfg.publicOrigin
          && providerOrigin != cfg.publicOrigin
          && cfg.legacyWebuiUrl != cfg.publicOrigin;
        message = "services.vpsadmin-webui public, API, OAuth provider and legacy origins must be distinct.";
      }
      {
        assertion = cfg.legacyWebuiUrl == null || isOrigin cfg.legacyWebuiUrl;
        message = "services.vpsadmin-webui.legacyWebuiUrl must be an HTTPS origin.";
      }
      {
        assertion =
          builtins.match "[A-Za-z0-9:_./ -]{1,256}" cfg.oauth.scope != null
          && builtins.match "[A-Za-z0-9_-]{1,64}" cfg.oauth.type != null;
        message = "services.vpsadmin-webui OAuth scope/type are invalid.";
      }
      {
        assertion =
          builtins.match "[!#$%&'*+.^_`|~0-9A-Za-z-]+" cfg.haveApi.authHeader != null
          && builtins.match "_[A-Za-z][A-Za-z0-9_]*" cfg.haveApi.metaNamespace != null;
        message = "services.vpsadmin-webui HaveAPI header/namespace are invalid.";
      }
      {
        assertion =
          validCredentialPath cfg.credentialFiles.oauthClientId
          && validCredentialPath cfg.credentialFiles.oauthClientSecret
          && validCredentialPath cfg.credentialFiles.sessionSecret;
        message = "services.vpsadmin-webui.credentialFiles must set three absolute runtime string paths outside the Nix store.";
      }
      {
        assertion = builtins.match "[A-Za-z0-9_-]{1,64}" cfg.cookieName != null;
        message = "services.vpsadmin-webui.cookieName is invalid.";
      }
      {
        assertion = validPackages;
        message = "services.vpsadmin-webui frontendPackage and bffPackage need matching build provenance.";
      }
      {
        assertion = !cfg.nginx.enable || builtins.match ipv4 cfg.nginx.listenAddress != null;
        message = "services.vpsadmin-webui.nginx.listenAddress must be one IPv4 address.";
      }
      {
        assertion =
          !cfg.nginx.enable
          || (
            validCidrs cfg.nginx.allowedClientAddresses
            && validCidrs cfg.nginx.trustedProxyAddresses
            && lib.all (
              address: lib.elem address cfg.nginx.allowedClientAddresses
            ) cfg.nginx.trustedProxyAddresses
          );
        message = "services.vpsadmin-webui.nginx proxy peers must be valid and trusted peers must be allowed.";
      }
      {
        assertion =
          lib.all (
            origin:
            isOrigin origin
            || (
              lib.hasPrefix "wss://" origin && isOrigin (lib.replaceStrings [ "wss://" ] [ "https://" ] origin)
            )
          ) cfg.security.consoleOrigins
          && lib.all isOrigin cfg.security.frameOrigins;
        message = "services.vpsadmin-webui.security origins must be exact HTTPS/WSS origins.";
      }
    ];

    users.groups.${account} = { };
    users.users.${account} = {
      isSystemUser = true;
      group = account;
      home = statePath;
      createHome = false;
    };

    systemd.services."vpsadmin-webui-bff" = {
      description = "vpsAdmin WebUI OAuth BFF";
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      after = [ "network-online.target" ];
      environment = publicEnvironment;
      serviceConfig = {
        Type = "simple";
        User = account;
        Group = account;
        ExecStart = "${cfg.bffPackage}/bin/vpsadmin-webui-bff";
        ExecStartPre = "${pkgs.coreutils}/bin/install -d -m 0700 ${sessionsPath}";
        LoadCredential = lib.filter (entry: entry != null) [
          (
            if cfg.credentialFiles.oauthClientId == null then
              null
            else
              "oauth-client-id:${cfg.credentialFiles.oauthClientId}"
          )
          (
            if cfg.credentialFiles.oauthClientSecret == null then
              null
            else
              "oauth-client-secret:${cfg.credentialFiles.oauthClientSecret}"
          )
          (
            if cfg.credentialFiles.sessionSecret == null then
              null
            else
              "session-secret:${cfg.credentialFiles.sessionSecret}"
          )
        ];
        UnsetEnvironment = [
          "OAUTH_CLIENT_ID"
          "OAUTH_CLIENT_SECRET"
          "SESSION_SECRET"
        ];
        StateDirectory = stateDirectory;
        StateDirectoryMode = "0700";
        UMask = "0077";
        ReadWritePaths = [ statePath ];
        Restart = "on-failure";
        RestartSec = "5s";
        KillMode = "control-group";
        TimeoutStopSec = "30s";
        NoNewPrivileges = true;
        CapabilityBoundingSet = "";
        AmbientCapabilities = "";
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictSUIDSGID = true;
        LockPersonality = true;
      };
    };

    services.nginx = mkIf cfg.nginx.enable {
      enable = true;
      appendHttpConfig = ''
        geo $vpsadmin_webui_allowed_peer {
          default 0;
          ${lib.concatMapStringsSep "\n" (address: "${address} 1;") cfg.nginx.allowedClientAddresses}
        }
        geo $vpsadmin_webui_trusted_edge {
          default 0;
          ${lib.concatMapStringsSep "\n" (address: "${address} 1;") cfg.nginx.trustedProxyAddresses}
        }
        map "$vpsadmin_webui_trusted_edge:$http_x_forwarded_proto:$http_x_forwarded_for" $vpsadmin_webui_forwarding_valid {
          default 0;
          "0::" 1;
          "~^1:(https|http):${ipv4}$" 1;
          "~^1:(https|http):[0-9A-Fa-f:]{2,39}$" 1;
        }
        map "$vpsadmin_webui_trusted_edge:$http_x_forwarded_proto" $vpsadmin_webui_public_scheme {
          default http;
          "1:https" https;
          "1:http" http;
        }
        map $vpsadmin_webui_trusted_edge $vpsadmin_webui_client_ip {
          default $remote_addr;
          1 $http_x_forwarded_for;
        }
      '';
      virtualHosts.${publicHost} = {
        serverName = publicHost;
        listen = [
          {
            addr = cfg.nginx.listenAddress;
            port = cfg.nginx.port;
          }
        ];
        root = "${cfg.frontendPackage}";
        # Each location owns its headers; nginx does not inherit server headers
        # into a location that declares add_header.
        extraConfig = ''
          if ($vpsadmin_webui_allowed_peer = 0) { return 403; }
          if ($http_host != "${publicAuthority}") { return 421; }
          if ($vpsadmin_webui_forwarding_valid = 0) { return 400; }
          autoindex off;
          index index.html;
        '';
        locations = {
          "/" = staticLocation;
          "= /index.html" = exactStatic;
          "= /build-info.json" = exactStatic;
          "= /favicon.png" = exactStatic;
          "^~ /assets/" = exactStatic // {
            extraConfig =
              staticHeaders
              + ''add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404;'';
          };
          "~* \\.(js|css|png|jpg|jpeg|svg|webp|ico|woff|woff2|map)$" = exactStatic;
          "= /config.local.js" = {
            extraConfig = staticHeaders + ''add_header Cache-Control "no-store" always; return 404;'';
          };
          "= /config.json" = proxyLocation;
          "= /config.js" = proxyLocation;
          "= /session.json" = proxyLocation;
          "= /healthz" = healthProxyLocation;
          "= /oauth" = {
            extraConfig = ''access_log off; error_log /dev/null; add_header Cache-Control "no-store" always; add_header X-Content-Type-Options nosniff always; return 404;'';
          };
          "^~ /oauth/" = oauthProxyLocation;
        };
      };
    };
  };
}
