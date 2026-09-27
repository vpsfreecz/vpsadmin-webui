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
    {
      self,
      nixpkgs,
      vpsadmin,
      ...
    }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
      source = import ./nix/source.nix {
        lib = nixpkgs.lib;
        root = self.outPath;
      };
      provenance = import ./nix/provenance.nix {
        lib = nixpkgs.lib;
        inherit self;
      };
    in
    {
      packages = forAllSystems (pkgs: {
        frontend = import ./packages/frontend.nix { inherit pkgs source provenance; };
        bff = import ./packages/bff.nix { inherit pkgs source provenance; };
      });

      nixosModules.default = import ./nixos/modules/webui.nix { inherit self; };

      checks = forAllSystems (pkgs: {
        module-eval =
          let
            results = import ./tests/nixos/module-eval.nix { inherit self nixpkgs vpsadmin; };
          in
          assert builtins.deepSeq results true;
          pkgs.runCommand "vpsadmin-webui-module-eval"
            {
              passthru = { inherit results; };
            }
            ''
              touch "$out"
            '';
        provenance =
          assert builtins.deepSeq (import ./nix/provenance-tests.nix { lib = nixpkgs.lib; }) true;
          pkgs.runCommand "vpsadmin-webui-provenance" { } ''
            touch "$out"
          '';
        source-contents =
          pkgs.runCommand "vpsadmin-webui-source-contents"
            {
              nativeBuildInputs = [ pkgs.nodejs_24 ];
            }
            ''
              node ${source}/scripts/check-package-source.mjs ${source}
              touch "$out"
            '';
        package-contents =
          pkgs.runCommand "vpsadmin-webui-package-contents"
            {
              nativeBuildInputs = [ pkgs.nodejs_24 ];
            }
            ''
              node ${source}/scripts/check-package-contents.mjs \
                --frontend ${self.packages.${pkgs.stdenv.hostPlatform.system}.frontend} \
                --bff ${self.packages.${pkgs.stdenv.hostPlatform.system}.bff}
              touch "$out"
            '';
      });

      # Pinned Node development toolchain for the frontend and BFF.
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            nixfmt
            prefetch-npm-deps
          ];
        };
      });
    };
}
