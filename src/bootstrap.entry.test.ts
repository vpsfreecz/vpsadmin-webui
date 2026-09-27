import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  window.vpsAdmin = undefined;
});

it('required BFF entrypoint shows a retry and never falls back to optional scripts', async () => {
  vi.resetModules();
  vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
  document.body.innerHTML = '<div id="root"></div>';
  const fetchImpl = vi.fn(async (..._args: Parameters<typeof fetch>) => new Response('<html>private-body</html>', {
    headers: { 'content-type': 'text/html' },
  }));
  vi.stubGlobal('fetch', fetchImpl);
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await import('./bootstrap');
  await vi.waitFor(() => expect(document.querySelector('button')?.textContent).toBe('Retry'));
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(String(fetchImpl.mock.calls[0]?.[0])).toMatch(/\/config\.json$/);
  expect(document.querySelectorAll('script[src*="config"]')).toHaveLength(0);
  expect(window.vpsAdmin).toBeUndefined();
  expect(document.getElementById('root')?.textContent).not.toContain('private-body');
  expect(log).toHaveBeenCalledWith('vpsAdmin UI bootstrap failed', { failure: 'config_mime' });

  document.querySelector('button')?.click();
  await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
  expect(String(fetchImpl.mock.calls[1]?.[0])).toMatch(/\/config\.json$/);
  expect(document.querySelectorAll('script[src*="config"]')).toHaveLength(0);
});
