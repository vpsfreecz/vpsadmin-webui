import { buildVpsCreatePayload, defaultForm, validateForm, type FormState } from './VpsCreatePage';

function validForm(overrides: Partial<FormState> = {}): FormState {
  return {
    ...defaultForm(),
    locationId: '3',
    nodeId: '5',
    osTemplateId: '6',
    userId: '1',
    hostname: 'test-vps',
    ...overrides,
  };
}

describe('VpsCreatePage payload guardrails', () => {
  it('builds a user create payload with location and without admin-only fields', () => {
    const payload = buildVpsCreatePayload(validForm({ info: 'ignored' }), {
      isAdminMode: false,
      needsAdminPayload: false,
    });

    expect(payload).toEqual({
      mode: 'user',
      hostname: 'test-vps',
      os_template: 6,
      start: true,
      cpu: 8,
      memory: 4096,
      diskspace: 122880,
      swap: 0,
      ipv4: 1,
      ipv6: 1,
      ipv4_private: 0,
      location: 3,
    });
    expect(payload).not.toHaveProperty('user');
    expect(payload).not.toHaveProperty('node');
    expect(payload).not.toHaveProperty('info');
  });

  it('builds an explicit admin create payload without location/environment fields', () => {
    const payload = buildVpsCreatePayload(validForm({ info: 'admin note' }), {
      isAdminMode: true,
      needsAdminPayload: true,
    });

    expect(payload).toEqual({
      mode: 'admin',
      hostname: 'test-vps',
      os_template: 6,
      start: true,
      cpu: 8,
      memory: 4096,
      diskspace: 122880,
      swap: 0,
      ipv4: 1,
      ipv6: 1,
      ipv4_private: 0,
      user: 1,
      node: 5,
      info: 'admin note',
    });
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('environment');
  });

  it('builds admin-account app view payload for current user without leaking location to the API', () => {
    const payload = buildVpsCreatePayload(validForm({ userId: '', nodeId: '', info: 'ignored' }), {
      isAdminMode: false,
      needsAdminPayload: true,
      hiddenAdminTarget: { userId: 21, nodeId: 7 },
    });

    expect(payload).toEqual({
      mode: 'admin',
      hostname: 'test-vps',
      os_template: 6,
      start: true,
      cpu: 8,
      memory: 4096,
      diskspace: 122880,
      swap: 0,
      ipv4: 1,
      ipv6: 1,
      ipv4_private: 0,
      user: 21,
      node: 7,
      info: '',
    });
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('environment');
  });

  it('requires hidden admin target only for admin accounts in app view', () => {
    expect(validateForm(validForm({ userId: '', nodeId: '' }), false)).toEqual([]);

    expect(validateForm(validForm({ userId: '', nodeId: '' }), false, { userId: 21 })).toContain(
      'vps.create.validation.auto_node_required'
    );

    expect(validateForm(validForm({ userId: '', nodeId: '' }), false, { nodeId: 7 })).toContain(
      'vps.create.validation.user_required'
    );
  });

  it('matches the API minimum memory requirement', () => {
    expect(validateForm(validForm({ memory: '512' }), false)).toContain(
      'vps.create.validation.memory'
    );
    expect(validateForm(validForm({ memory: '1024' }), false)).not.toContain(
      'vps.create.validation.memory'
    );
  });
});


describe('VPS creation hostname defaults', () => {
  it('leaves a new hostname empty for immediate typing', () => {
    expect(defaultForm().hostname).toBe('');
  });

  it.each([false, true])('resolves blank hostnames in validation and payload (admin=%s)', (isAdminMode) => {
    for (const hostname of ['', '   ', '\t\n']) {
      const form = validForm({ hostname });
      expect(validateForm(form, isAdminMode)).toEqual([]);
      expect(buildVpsCreatePayload(form, { isAdminMode, needsAdminPayload: isAdminMode }).hostname).toBe('VPS');
    }
  });

  it('preserves custom hostnames and still rejects invalid non-empty names', () => {
    const form = validForm({ hostname: '  My-VPS.example  ' });
    expect(buildVpsCreatePayload(form, { isAdminMode: false, needsAdminPayload: false }).hostname).toBe('My-VPS.example');
    for (const hostname of ['x', '-invalid', 'has spaces', 'x'.repeat(65)]) {
      expect(validateForm(validForm({ hostname }), false)).toContain('vps.create.validation.hostname_format');
    }
  });
});
