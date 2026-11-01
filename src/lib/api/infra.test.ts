import { beforeEach } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { describe, expect, it, vi } from 'vitest';

import { setEnvironmentMaintenance, setLocationMaintenance } from './infra';

function mockFetchOk(resource: string) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, response: { [resource]: {} } }) });
}

describe('infrastructure maintenance API', () => {
  it.each([
    ['environment', () => setEnvironmentMaintenance(4, { lock: true, reason: 'network work' }), '/v7.0/environments/4/set_maintenance',
    ],
    ['location', () => setLocationMaintenance(7, { lock: false }), '/v7.0/locations/7/set_maintenance'],
  ])('posts the %s maintenance action', async (_name, call, path) => {
    apiWire.respond = mockFetchOk(String(_name)) as typeof fetch;
    await call();
    const [url, init] = vi.mocked(apiWire.respond).mock.calls.at(-1) as [string, RequestInit];
    expect(new URL(url).pathname).toBe(path);
    expect(init.method).toBe('POST');
  });
});

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: 'v7.0' },
    sessionToken: 'test-token',
    description: { meta: { namespace: '_meta' }, authentication: { token: { http_header: 'X-Auth-Token' } } },
  };
});
