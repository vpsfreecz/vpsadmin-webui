import { buildVpsInitializationPayload, defaultVpsInitialization, initializationError } from './VpsInitializationModel';
import { buildVpsCreatePayload, defaultForm, validateForm } from './VpsCreateModel';
import { buildVpsReinstallPayload, defaultReinstallForm } from './VpsReinstallModel';
import { buildCreateVpsParams } from '../../../lib/api/vps';
import { USER_DATA_FORMATS } from '../../../components/user/UserDataTemplatesModel';

const saved = {
  ...defaultVpsInitialization(),
  userDataEnabled: true,
  userDataSource: 'saved' as const,
  userDataTemplateId: '22',
  userDataOwnerId: 7,
  userDataContent: 'must not be sent',
};

describe('VPS initialization requests', () => {
  it.each(USER_DATA_FORMATS)('preserves inline %s content exactly', (format) => {
    const content = '\n  example\n';
    expect(
      buildVpsInitializationPayload(
        { ...saved, userDataSource: 'inline', userDataFormat: format, userDataContent: content },
        7
      )
    ).toEqual({ user_data_format: format, user_data_content: content });
  });
  it('sends only the saved ID and omits all fields when disabled', () => {
    expect(buildVpsInitializationPayload(saved, 7)).toEqual({ vps_user_data: 22 });
    expect(buildVpsInitializationPayload({ ...saved, userDataEnabled: false }, 8)).toEqual({});
  });
  it('rejects stale owner selections and invalid IDs', () => {
    expect(() => buildVpsInitializationPayload(saved, 8)).toThrow('template_required');
    expect(() => buildVpsInitializationPayload(saved)).toThrow('owner_required');
    for (const id of ['', '0', '-2', '2.5', '#22', '9007199254740992']) {
      expect(initializationError({ ...saved, userDataTemplateId: id }, 7)).toBe('vps.initialization.template_required');
    }
  });
  it.each(['user', 'admin'] as const)('keeps saved selection through the %s create adapter', (mode) => {
    const form = {
      ...defaultForm(),
      ...saved,
      userId: '7',
      nodeId: '1',
      locationId: '2',
      osTemplateId: '6',
      hostname: 'example.test',
    };
    const params = buildCreateVpsParams(
      buildVpsCreatePayload(form, { isAdminMode: mode === 'admin', needsAdminPayload: mode === 'admin', memberId: 7 })
    );
    expect(params).toMatchObject({ vps_user_data: 22, os_template: 6 });
    expect(params).not.toHaveProperty('user_data_content');
    expect(params).not.toHaveProperty('user_data_format');
    expect(validateForm({ ...form, userId: '8' }, true)).toContain('vps.initialization.template_required');
  });
  it('supports saved and inline data for reinstall', () => {
    expect(buildVpsReinstallPayload({ ...defaultReinstallForm(6), ...saved }, 7)).toEqual({
      os_template: 6,
      vps_user_data: 22,
    });
    const form = { ...defaultForm(), ...saved, userDataSource: 'inline' as const };
    expect(
      buildCreateVpsParams(buildVpsCreatePayload(form, { isAdminMode: false, needsAdminPayload: false, memberId: 7 }))
    ).toMatchObject({ user_data_content: 'must not be sent', user_data_format: 'cloudinit_config' });
  });
});
