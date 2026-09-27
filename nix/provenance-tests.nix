{ lib }:

let
  revision = "0123456789abcdef0123456789abcdef01234567";
  resolve = self: import ./provenance.nix { inherit lib self; };
  clean = resolve { rev = revision; };
  dirty = resolve { dirtyRev = "${revision}-dirty"; };
  unknown = resolve { outPath = /tmp; };
  malformed = resolve { dirtyRev = "${revision}-unexpected"; };
  results = {
    clean = clean.commit == revision && !clean.dirty && clean.buildInfo.source == "environment";
    dirty = dirty.commit == revision && dirty.dirty && dirty.buildInfo.source == "environment";
    unknown = unknown.commit == "unknown" && unknown.dirty && unknown.buildInfo.source == "unavailable";
    malformed = malformed.commit == "unknown" && malformed.dirty;
  };
in
assert lib.all (value: value) (builtins.attrValues results);
results
