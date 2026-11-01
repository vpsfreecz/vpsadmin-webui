import { afterEach, describe, expect, it, vi } from 'vitest';
import { installHaveApiXhr } from '../../test/haveapiXhr';
import { fetchUserEnvironmentConfigs, updateUserEnvironmentConfig } from './userEnvironmentConfigs';

function fixture(response: unknown) {
  window.vpsAdmin = {
    api: { url: 'https://environment-config.example.test', version: '7.0' },
    description: { meta: { namespace: '_meta' } },
  };
  const respond = vi.fn(
    async (..._args: Parameters<typeof fetch>) =>
      new Response(JSON.stringify({ status: true, response }), { status: 200 })
  );
  installHaveApiXhr(respond);
  return respond;
}
afterEach(() => {
  window.vpsAdmin = undefined;
});

describe('user environment configuration boundaries', () => {
  it('keeps partial/nullable associations and unknown booleans without defaults', async () => {
    fixture({
      environment_configs: [{ id: 7, environment: { label: 'Staging' }, can_create_vps: null, max_vps_count: 0 }],
    });
    await expect(fetchUserEnvironmentConfigs(42)).resolves.toMatchObject({
      data: [{ id: 7, environment: { label: 'Staging' }, can_create_vps: null, max_vps_count: 0 }],
    });
  });
  it('sends explicit false and zero', async () => {
    const respond = fixture({ environment_config: { id: 7, environment: null } });
    await updateUserEnvironmentConfig(42, 7, { can_create_vps: false, max_vps_count: 0 });
    expect(JSON.parse(String(respond.mock.calls[0]![1]?.body))).toEqual({
      environment_config: { can_create_vps: false, max_vps_count: 0 },
    });
  });
  it('rejects a malformed present association without dropping its row', async () => {
    fixture({ environment_configs: [{ id: 7, environment: { id: '7' } }] });
    await expect(fetchUserEnvironmentConfigs(42)).rejects.toMatchObject({
      phase: 'post-dispatch',
      result: { httpStatus: 200 },
    });
  });
});
