{
  description = "vpsAdmin WebUI development and packaging";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

    # The API and localization reference. Site configuration may replace this
    # whole input with its vpsadminServices input.
    vpsadmin = {
      url = "github:vpsfreecz/vpsadmin/a65a4dfeb92a59df4a80a737a20bcbf8558793ff";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # Pinned Node development toolchain for the frontend and BFF.
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            nixfmt
          ];
        };
      });
    };
}
