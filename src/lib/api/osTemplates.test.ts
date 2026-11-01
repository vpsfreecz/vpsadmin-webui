import { describe, expect, test } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { fetchOsTemplates, isOsTemplateAvailable } from './osTemplates';

describe('generated OS template boundary', () => {
  test('sends declared false filters and preserves nullable fields and the receipt', async () => {
    const response = { os_templates: [{ id: 4, label: null, enabled: null, os_family: { id: null } }], _meta: { count: 9 } };
    installHaveApiXhr(() => ({ status: 200, json: async () => ({ status: true, response }) }));
    const result = await fetchOsTemplates({ enableScript: false, enableCloudInit: false, osFamily: 2 });
    expect(result).toMatchObject({ data: response.os_templates, meta: { count: 9 }, httpStatus: 200, envelope: { response } });
    const url = new URL(apiWire.requests.find(request => request.method === 'GET')!.url);
    expect(url.searchParams.get('os_template[enable_script]')).toBe('false');
    expect(url.searchParams.get('os_template[enable_cloud_init]')).toBe('false');
    expect(url.searchParams.has('os_template[q]')).toBe(false);
  });

  test.each(['enabled', 'label', 'os_family'])('rejects malformed %s with its original receipt', async field => {
    const response = { os_templates: [{ id: 4, [field]: 3 }], _meta: { trace: 'retained' } };
    installHaveApiXhr(() => ({ status: 200, json: async () => ({ status: true, response }) }));
    await expect(fetchOsTemplates()).rejects.toMatchObject({ result: { envelope: { response }, httpStatus: 200 } });
  });

  test.each(['admin', 'user', 'support', undefined])('uses actual authenticated role %s for eligibility', role => {
    expect(isOsTemplateAvailable({ id: 1, enabled: true }, role)).toBe(role !== undefined);
    expect(isOsTemplateAvailable({ id: 1 }, role)).toBe(role === 'user' || role === 'support');
    for (const enabled of [false, null]) expect(isOsTemplateAvailable({ id: 1, enabled }, role)).toBe(false);
    // An administrator using member mode still passes the real admin role.
    expect(isOsTemplateAvailable({ id: 1 }, 'admin')).toBe(false);
  });
});
