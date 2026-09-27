{ lib, root }:

let
  excludedDirectories = [
    ".git"
    ".vite"
    "artifacts"
    "dist"
    "node_modules"
    "output"
    "playwright-report"
    "work"
  ];
  rootString = toString root;
in
lib.cleanSourceWith {
  src = root;
  filter =
    path: _type:
    let
      relative = lib.removePrefix "${rootString}/" (toString path);
      parts = lib.splitString "/" relative;
      privatePart = part: lib.hasPrefix ".env" part || lib.elem part excludedDirectories;
    in
    !(lib.any privatePart parts)
    && relative != "public/config.local.js"
    && relative != "e2e/test-results"
    && !(lib.hasPrefix "e2e/test-results/" relative);
}
