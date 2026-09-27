{ lib, self }:

let
  isFullSha = value: builtins.isString value && builtins.match "[0-9a-f]{40}" value != null;
  cleanRevision = self.rev or null;
  dirtyRevision = self.dirtyRev or null;
  underlyingDirtyRevision =
    if builtins.isString dirtyRevision && lib.hasSuffix "-dirty" dirtyRevision then
      lib.removeSuffix "-dirty" dirtyRevision
    else
      null;
  clean = isFullSha cleanRevision && dirtyRevision == null;
  knownDirty = isFullSha underlyingDirtyRevision && cleanRevision == null;
  commit =
    if clean then
      cleanRevision
    else if knownDirty then
      underlyingDirtyRevision
    else
      "unknown";
  dirty = !clean;
  source = if clean || knownDirty then "environment" else "unavailable";
in
{
  inherit commit dirty source;
  buildInfo = {
    schemaVersion = 1;
    inherit commit dirty source;
    shortCommit = if commit == "unknown" then commit else builtins.substring 0 12 commit;
  };
}
