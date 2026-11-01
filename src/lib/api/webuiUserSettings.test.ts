import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { fetchWebuiUserSetting, saveWebuiUserSetting } from './webuiUserSettings';

function fixture(path = '/webui_user_settings', response: unknown = { webui_user_setting: {} }) {
  window.vpsAdmin = {
    api: { url: 'https://settings.example.test/mounted', version: 'v7.0' },
    description: { meta: { namespace: '_meta' } },
    webuiNext: { uiSettings: { server: { path } } },
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

describe('generated settings operations', () => {
  it('uses the mounted version base and encodes keyed segments once', async () => {
    const respond = fixture('/webui_user_settings/');
    await saveWebuiUserSetting('ui prefs', 'theme/key', { theme: 'dark' });
    const [url, init] = respond.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/mounted/v7.0/webui_user_settings/ui%20prefs/theme%2Fkey');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ webui_user_setting: { value: '{"theme":"dark"}' } });
    expect(respond).toHaveBeenCalledTimes(1);
  });
  it('loads the exact configurable namespace/key and stored JSON value', async () => {
    const respond = fixture('/webui_user_settings', {
      webui_user_settings: [{ namespace: 'other', key: 'prefs', value: '{"theme":"dark"}' }],
    });
    await expect(fetchWebuiUserSetting('other', 'prefs')).resolves.toEqual({ theme: 'dark' });
    const url = new URL(String(respond.mock.calls[0]![0]));
    expect(url.searchParams.get('webui_user_setting[namespace]')).toBe('other');
    expect(url.searchParams.get('webui_user_setting[key]')).toBe('prefs');
  });
  it.each([
    '/other',
    '/prefix/webui_user_settings',
    '/webui_user_settings/suffix',
    '/v7.0/webui_user_settings',
    '/webui_user_settings?q=1',
    'https://elsewhere/webui_user_settings',
  ])('rejects unsupported config %s before discovery or dispatch', async (path) => {
    fixture(path);
    await expect(fetchWebuiUserSetting('ui', 'settings')).rejects.toMatchObject({
      phase: 'pre-dispatch',
      message: expect.stringContaining('/webui_user_settings'),
    });
    await expect(saveWebuiUserSetting('ui', 'settings', {})).rejects.toMatchObject({ phase: 'pre-dispatch' });
    expect(apiWire.respond).not.toHaveBeenCalled();
  });
  it('does not replay an authoritative save rejection', async () => {
    const respond = fixture();
    respond.mockImplementation(
      async () => new Response(JSON.stringify({ status: false, message: 'denied', response: {} }), { status: 403 })
    );
    await expect(saveWebuiUserSetting('ui', 'settings', {})).rejects.toThrow('denied');
    expect(respond).toHaveBeenCalledTimes(1);
  });
  it('rejects unrepresentable settings locally before send', async () => {
    const respond = fixture();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    await expect(saveWebuiUserSetting('ui', 'settings', circular)).rejects.toMatchObject({ phase: 'pre-dispatch' });
    await expect(saveWebuiUserSetting('ui', 'settings', undefined)).rejects.toMatchObject({ phase: 'pre-dispatch' });
    expect(respond).not.toHaveBeenCalled();
  });
  it('keeps malformed reads distinct from a missing setting', async () => {
    fixture('/webui_user_settings', { webui_user_settings: [{ namespace: 'ui', key: null }] });
    await expect(fetchWebuiUserSetting('ui', 'settings')).rejects.toMatchObject({
      phase: 'post-dispatch',
      result: { httpStatus: 200 },
    });
  });
});
