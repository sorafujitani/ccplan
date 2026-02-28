{
  description = "ccplan – CLI tool to manage Claude Code plan file lifecycle";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    shared-flake.url = "github:sorafujitani/shared-flake-nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      shared-flake,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = shared-flake.lib.mkDevShell {
          inherit pkgs;
          name = "ccplan";
          buildInputs = with pkgs; [
            bun
            nodejs_22
          ];
          shellHook = ''
            echo "ccplan dev shell ready (bun $(bun --version))"
          '';
        };
      }
    );
}
