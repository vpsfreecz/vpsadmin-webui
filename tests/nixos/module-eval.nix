{
  self,
  nixpkgs,
  vpsadmin,
}:

let
  lib = nixpkgs.lib;
  system = "x86_64-linux";
  pkgs = nixpkgs.legacyPackages.${system};
  module = self.nixosModules.default;
  evaluate =
    modules:
    lib.nixosSystem {
      modules = [
        { nixpkgs.hostPlatform = system; }
        module
      ]
      ++ modules;
    };
  options = {
    enable = true;
    publicOrigin = "https://newadmin.example.test";
    api = {
      url = "https://api.example.test";
      version = "7.0";
    };
    oauth = {
      authorizeUrl = "https://auth.example.test/_auth/oauth2/authorize";
      tokenUrl = "https://auth.example.test/_auth/oauth2/token";
      revokeUrl = "https://auth.example.test/_auth/oauth2/revoke";
      passwordRecoveryUrl = "https://auth.example.test/oauth2/password-reset";
    };
    environmentFile = "/private/webui.env";
    legacyWebuiUrl = "https://legacy.example.test";
    nginx = {
      listenAddress = "192.0.2.170";
      trustedProxyAddresses = [ "192.0.2.140/32" ];
      allowedClientAddresses = [
        "192.0.2.140/32"
        "127.0.0.1/32"
      ];
    };
    security = {
      consoleOrigins = [ "wss://console.example.test" ];
      frameOrigins = [ "https://console.example.test" ];
    };
  };
  enabled =
    overrides:
    evaluate [
      {
        system.stateVersion = "25.11";
        services."vpsadmin-webui" = lib.recursiveUpdate options overrides;
      }
    ];
  disabled = evaluate [ { system.stateVersion = "25.11"; } ];
  valid = enabled { };
  invalid = enabled {
    publicOrigin = "https://newadmin.example.test/unsafe";
    environmentFile = null;
    oauth.revokeUrl = "https://other.example.test/revoke";
    nginx.trustedProxyAddresses = [ "0.0.0.0/0" ];
    security.consoleOrigins = [ "https:" ];
  };
  invalidPort = enabled { publicOrigin = "https://newadmin.example.test:65536"; };
  reusedOrigin = enabled { api.url = "https://newadmin.example.test/api"; };
  credentialUrl = enabled { oauth.tokenUrl = "https://user:secret@auth.example.test/token"; };
  recoveryQuery = enabled {
    oauth.passwordRecoveryUrl = "https://auth.example.test/oauth2/password-reset?client_id=fixture";
  };
  mismatched = enabled {
    frontendPackage = pkgs.runCommand "mismatched-webui-frontend" {
      passthru.provenance.buildInfo = {
        schemaVersion = 1;
        commit = "fedcba9876543210fedcba9876543210fedcba98";
        shortCommit = "fedcba987654";
        dirty = false;
        source = "environment";
      };
    } "touch $out";
  };
  stateOverride = builtins.tryEval (
    (enabled { stateDirectory = "vpsadmin"; }).config.services."vpsadmin-webui".enable
  );
  legacy = evaluate [
    (import "${vpsadmin}/nixos/modules/vpsadmin/webui.nix")
    {
      options.vpsadmin = {
        stateDirectory = lib.mkOption {
          type = lib.types.str;
          default = "/var/lib/vpsadmin";
        };
        enableOverlay = lib.mkOption {
          type = lib.types.bool;
          default = false;
        };
        enableStateDirectory = lib.mkOption {
          type = lib.types.bool;
          default = false;
        };
      };
      config = {
        system.stateVersion = "25.11";
        time.timeZone = "UTC";
        vpsadmin.webui = {
          enable = true;
          domain = "legacy.example.test";
          package = pkgs.writeTextDir "public/index.php" "fixture";
          api.externalUrl = "https://api.example.test";
          api.internalUrl = "http://127.0.0.1:3101";
          productionEnvironmentId = 1;
        };
        services."vpsadmin-webui" = options;
      };
    }
  ];
  failures =
    evaluated:
    map (entry: entry.message) (
      lib.filter (
        entry: !entry.assertion && lib.hasPrefix "services.vpsadmin-webui" entry.message
      ) evaluated.config.assertions
    );
  service = valid.config.systemd.services."vpsadmin-webui-bff";
  vhost = valid.config.services.nginx.virtualHosts."newadmin.example.test";
  results = {
    disabled =
      !(disabled.config.systemd.services ? "vpsadmin-webui-bff")
      && !(disabled.config.users.users ? "vpsadmin-webui-bff")
      && !(disabled.config.services.nginx.virtualHosts ? "newadmin.example.test");
    valid =
      failures valid == [ ]
      && service.environment.BFF_RUNTIME_MODE == "production"
      && service.environment.NODE_ENV == "production"
      && service.environment.API_URL == options.api.url
      && service.environment.API_VERSION == options.api.version
      && service.environment.OAUTH_REVOKE_URL == options.oauth.revokeUrl
      && service.environment.OAUTH_REDIRECT_URI == "https://newadmin.example.test/oauth/callback"
      && service.environment.PASSWORD_RECOVERY_URL == options.oauth.passwordRecoveryUrl
      && service.environment.SESSION_STORE_PATH == "/var/lib/vpsadmin-webui/sessions"
      && service.environment.PORT == "3001"
      && !(service.environment ? OAUTH_CLIENT_SECRET)
      && !(service.environment ? OAUTH_CLIENT_ID)
      && !(service.environment ? SESSION_SECRET)
      && service.serviceConfig.EnvironmentFile == [ "/private/webui.env" ]
      && service.serviceConfig.User == "vpsadmin-webui-bff"
      && service.serviceConfig.StateDirectoryMode == "0700"
      && service.serviceConfig.StateDirectory == "vpsadmin-webui"
      && valid.config.users.users."vpsadmin-webui-bff".home == "/var/lib/vpsadmin-webui"
      && service.serviceConfig.UMask == "0077"
      && lib.hasInfix "install -d -m 0700 /var/lib/vpsadmin-webui/sessions" service.serviceConfig.ExecStartPre
      && service.serviceConfig.ProtectSystem == "strict"
      && service.serviceConfig.ReadWritePaths == [ "/var/lib/vpsadmin-webui" ]
      &&
        vhost.listen == [
          {
            addr = "192.0.2.170";
            port = 80;
            ssl = false;
            proxyProtocol = false;
            extraParameters = [ ];
          }
        ]
      && vhost.locations."= /config.json".recommendedProxySettings == false
      && vhost.locations."= /config.js".recommendedProxySettings == false
      && vhost.locations."= /session.json".recommendedProxySettings == false
      && vhost.locations."= /healthz".recommendedProxySettings == false
      && lib.hasInfix "if ($vpsadmin_webui_allowed_peer = 0) { return 403; }" vhost.extraConfig
      && !(lib.hasInfix "add_header" vhost.extraConfig)
      && lib.hasInfix "add_header X-Content-Type-Options nosniff always;" vhost.locations."/".extraConfig
      &&
        lib.hasInfix "add_header X-Content-Type-Options nosniff always;"
          vhost.locations."= /session.json".extraConfig
      &&
        lib.hasInfix "proxy_set_header X-Forwarded-Proto $vpsadmin_webui_public_scheme"
          vhost.locations."= /session.json".extraConfig
      &&
        lib.hasInfix "proxy_set_header X-Forwarded-For $vpsadmin_webui_client_ip"
          vhost.locations."= /session.json".extraConfig
      && !(lib.hasInfix "Content-Security-Policy" vhost.locations."= /session.json".extraConfig)
      && lib.hasInfix "Content-Security-Policy" vhost.locations."/".extraConfig
      && lib.hasInfix "https://nominatim.openstreetmap.org" vhost.locations."/".extraConfig
      && lib.hasInfix "https://www.openstreetmap.org" vhost.locations."/".extraConfig
      && lib.hasInfix "try_files $uri $uri/ /index.html" vhost.locations."/".extraConfig
      && lib.hasInfix "try_files $uri =404" vhost.locations."^~ /assets/".extraConfig
      && lib.hasInfix "try_files $uri =404" vhost.locations."= /build-info.json".extraConfig
      && lib.hasInfix "return 404" vhost.locations."= /config.local.js".extraConfig
      && lib.hasInfix "access_log off" vhost.locations."= /oauth".extraConfig
      && lib.hasInfix "error_log /dev/null" vhost.locations."= /oauth".extraConfig
      && lib.hasInfix "access_log off" vhost.locations."^~ /oauth/".extraConfig
      && lib.hasInfix "error_log /dev/null" vhost.locations."^~ /oauth/".extraConfig
      && !(lib.hasInfix "error_log /dev/null" vhost.locations."/".extraConfig);
    invalid =
      lib.length (failures invalid) >= 5
      && lib.any (message: lib.hasInfix "publicOrigin" message) (failures invalid)
      && lib.any (message: lib.hasInfix "environmentFile" message) (failures invalid)
      && lib.any (message: lib.hasInfix "provider origin" message) (failures invalid)
      && lib.any (message: lib.hasInfix "proxy peers" message) (failures invalid);
    invalidPort = lib.any (message: lib.hasInfix "publicOrigin" message) (failures invalidPort);
    reusedOrigin = lib.any (message: lib.hasInfix "origins must be distinct" message) (
      failures reusedOrigin
    );
    credentialUrl = lib.any (message: lib.hasInfix "credential-free" message) (failures credentialUrl);
    recoveryQuery =
      failures recoveryQuery == [ ]
      &&
        recoveryQuery.config.systemd.services."vpsadmin-webui-bff".environment.PASSWORD_RECOVERY_URL
        == "https://auth.example.test/oauth2/password-reset?client_id=fixture";
    mismatchedPackages = lib.any (message: lib.hasInfix "matching build provenance" message) (
      failures mismatched
    );
    fixedStateDirectory =
      !(valid.options.services."vpsadmin-webui" ? stateDirectory) && !stateOverride.success;
    legacyCoexistence =
      failures legacy == [ ]
      && legacy.config.vpsadmin.webui.enable
      && legacy.config.services."vpsadmin-webui".enable
      && legacy.config.users.users."vpsadmin-webui".group == "vpsadmin-webui"
      && legacy.config.users.users."vpsadmin-webui-bff".group == "vpsadmin-webui-bff"
      && legacy.config.services.nginx.virtualHosts ? "legacy.example.test"
      && legacy.config.services.nginx.virtualHosts ? "newadmin.example.test";
  };
in
assert lib.all (value: value) (builtins.attrValues results);
results
