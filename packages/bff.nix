{
  pkgs,
  source,
  provenance,
}:

let
  runtimeFiles = builtins.fromJSON (builtins.readFile ./bff-runtime-files.json);
  metadata = pkgs.writeText "vpsadmin-webui-bff-build-info.json" "${builtins.toJSON provenance.buildInfo}\n";
in
pkgs.buildNpmPackage {
  pname = "vpsadmin-webui-bff";
  version = "0.1.0";
  src = source + "/bff";
  nodejs = pkgs.nodejs_24;
  npmDepsHash = "sha256-imijdRISN2eVBsYX79YBxl7zKM7Pjq3rixkKXJNDSvw=";
  npmInstallFlags = [ "--omit=dev" ];
  dontNpmBuild = true;

  installPhase = ''
    runHook preInstall
    runtime="$out/lib/vpsadmin-webui-bff"
    mkdir -p "$runtime" "$out/bin" "$out/share/vpsadmin-webui-bff"
    install -m 0644 package.json "$runtime/package.json"
    for file in ${pkgs.lib.escapeShellArgs runtimeFiles}; do
      install -m 0644 "$file" "$runtime/$file"
    done
    cp -R node_modules "$runtime/node_modules"
    install -m 0644 ${metadata} "$out/share/vpsadmin-webui-bff/build-info.json"
    makeWrapper ${pkgs.nodejs-slim_24}/bin/node "$out/bin/vpsadmin-webui-bff" \
      --add-flags "$runtime/server.js"
    runHook postInstall
  '';

  nativeBuildInputs = [ pkgs.makeWrapper ];
  passthru = { inherit provenance; };
}
