{
  pkgs,
  source,
  provenance,
}:

let
  publicFiles = builtins.fromJSON (builtins.readFile ./frontend-public-files.json);
in
pkgs.buildNpmPackage {
  pname = "vpsadmin-webui-frontend";
  version = "1.0.0";
  src = source;
  nodejs = pkgs.nodejs_24;
  npmDepsHash = "sha256-q4Xy2p/fhQ9PrI2CQJE4vWRe/jObemXdOSGeBgEYwxI=";

  VITE_RUNTIME_MODE = "bff";
  VITE_BUILD_SHA = provenance.commit;
  VITE_BUILD_DIRTY = if provenance.dirty then "true" else "false";

  prePatch = ''
    ${pkgs.nodejs_24}/bin/node scripts/check-package-source.mjs .
  '';
  preBuild = ''
    node scripts/audit-design-docs.mjs
  '';

  # Vite copies public/config.local.js.example into dist. Install only the
  # reviewed public files, never the local configuration example.
  installPhase = ''
    runHook preInstall
    mkdir -p "$out/assets"
    for file in ${pkgs.lib.escapeShellArgs publicFiles}; do
      install -m 0644 "dist/$file" "$out/$file"
    done
    cp -R dist/assets/. "$out/assets/"
    runHook postInstall
  '';

  passthru = { inherit provenance; };
}
