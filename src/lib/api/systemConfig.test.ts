import { beforeEach } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { describe, expect, test, vi } from 'vitest';

import { fetchSystemConfigs } from './systemConfig';

function mockFetchOk(response: unknown): typeof apiWire.respond {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: true, response }),
  }) as unknown as typeof apiWire.respond;
}

describe('system config API wrappers', () => {
  test('scopes index requests to an API-supported category', async () => {
    apiWire.respond = mockFetchOk({ system_configs: [] });

    await fetchSystemConfigs({ category: ' plugin_payments ' });

    const [url] = vi.mocked(apiWire.respond).mock.calls.at(-1) as [string, RequestInit?];
    const requestUrl = new URL(url);
    expect(requestUrl.pathname).toBe('/v7.0/system_configs');
    expect(requestUrl.searchParams.get('system_config[category]')).toBe('plugin_payments');
  });

  test('keeps the full index request unchanged when no category is requested', async () => {
    apiWire.respond = mockFetchOk({ system_configs: [] });

    await fetchSystemConfigs();

    const [url] = vi.mocked(apiWire.respond).mock.calls.at(-1) as [string, RequestInit?];
    expect(new URL(url).searchParams.has('system_config[category]')).toBe(false);
  });
});

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: 'v7.0' },
    sessionToken: 'test-token',
    description: { meta: { namespace: '_meta' }, authentication: { token: { http_header: 'X-Auth-Token' } } },
  };
});

test('the SDK encodes configuration path segments once and preserves false', async () => {
  const { updateSystemConfig } = await import('./systemConfig');
  apiWire.respond = mockFetchOk({ system_config: { category: 'plugin/test', name: 'key?percent%', value: false } });
  await updateSystemConfig({ category: 'plugin/test', name: 'key?percent%', value: false });
  const [url, init] = vi.mocked(apiWire.respond).mock.calls.at(-1)!;
  expect(new URL(url).pathname).toBe('/v7.0/system_configs/plugin%2Ftest/key%3Fpercent%25');
  expect(JSON.parse(String(init?.body))).toEqual({ system_config: { value: false } });
});

test('heatmap configuration uses the anonymous generated Show policy', async () => {
  const { fetchPublicNodeHeatmapConfig } = await import('./systemConfig');
  apiWire.respond = mockFetchOk({ system_config: { value: 'https://heatmap.example.test' } });
  const result = await fetchPublicNodeHeatmapConfig();
  expect(result.data['value']).toBe('https://heatmap.example.test');
  const [url, init] = vi.mocked(apiWire.respond).mock.calls.at(-1)!;
  expect(new URL(url).pathname).toBe('/v7.0/system_configs/webui/goresheat_url');
  expect(init?.headers).not.toHaveProperty('X-Auth-Token');
  expect(init?.headers).not.toHaveProperty('Accept-Language');
});
