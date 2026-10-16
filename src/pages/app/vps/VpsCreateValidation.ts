const VALIDATION_FIELD_TARGETS: ReadonlyArray<readonly [readonly string[], string]> = [
  [[
    'vps.create.validation.user_required',
    'vps.create.validation.user_invalid',
    'vps.create.validation.user_verifying',
    'vps.create.validation.user_not_found',
  ], 'vps.create.user'],
  [['vps.create.validation.target_required'], 'vps.create.location'],
  [['vps.create.validation.node_required'], 'vps.create.node'],
  [['vps.create.validation.auto_node_required'], 'vps.create.location'],
  [['vps.create.validation.os_template_required'], 'vps.create.os_template'],
  [['vps.create.validation.hostname_required', 'vps.create.validation.hostname_format'], 'vps.create.hostname'],
  [['vps.initialization.content_required'], 'vps.create.user_data.content'],
  [['vps.initialization.template_required', 'vps.initialization.owner_required'], 'vps.create.user_data.template'],
  [['vps.create.validation.cpu'], 'vps.create.cpu'],
  [['vps.create.validation.memory'], 'vps.create.memory'],
  [['vps.create.validation.diskspace'], 'vps.create.diskspace'],
  [['vps.create.validation.swap'], 'vps.create.swap'],
  [['vps.create.validation.ipv4'], 'vps.create.ipv4'],
  [['vps.create.validation.ipv6'], 'vps.create.ipv6'],
  [['vps.create.validation.ipv4_private'], 'vps.create.ipv4_private'],
];

export function focusFirstInvalidField(validationKeys: string[]) {
  const keys = new Set(validationKeys);
  const targetTestId = VALIDATION_FIELD_TARGETS.find(([candidateKeys]) => candidateKeys.some((key) => keys.has(key)))?.[1];
  if (!targetTestId) return;

  const target = document.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

