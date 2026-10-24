import { installHaveApiXhr } from '../../test/haveapiXhr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  closeUserSession,
  createMetricsAccessToken,
  createUserPublicKey,
  deleteMetricsAccessToken,
  fetchMetricsAccessTokens,
  fetchUserPublicKeys,
  fetchUserSession,
  fetchUserSessions,
  updateUserSessionLabel,
} from './userDossier';

function makeOkResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setMockRuntime(metaNamespace = '_meta') {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: 'v7.0' },
    sessionToken: 'tok_123',
    description: {
      meta: { namespace: metaNamespace },
      authentication: { token: { http_header: 'X-Auth-Token' } },
    },
  };
}

function installOkFetch(response: unknown) {
  const fetchMock = vi.fn(async (..._args: Parameters<typeof fetch>) =>
    makeOkResponse({ status: true, response })
  );
  installHaveApiXhr( fetchMock);
  return fetchMock;
}

function getFetchCall(fetchMock: ReturnType<typeof installOkFetch>, index = 0): Parameters<typeof fetch> {
  return fetchMock.mock.calls[index]! as Parameters<typeof fetch>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.vpsAdmin = undefined;
});

describe('user dossier API wrappers', () => {
  it('fetchUserPublicKeys uses /users/:id/public_keys and public_key namespace for query params', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      public_keys: [{ id: 1, label: 'laptop' }],
    });

    await fetchUserPublicKeys(123, { limit: 10 });

    const [url] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/users/123/public_keys?');
    expect(new URL(String(url)).searchParams.get('public_key[limit]')).toBe('10');
  });

  it('createUserPublicKey sends public_key namespace payload', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      public_key: { id: 1, label: 'laptop' },
    });

    await createUserPublicKey(123, { label: 'laptop', key: 'ssh-ed25519 AAAA', auto_add: true });

    const [url, init] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/users/123/public_keys');
    expect(init?.method).toBe('POST');

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ public_key: { label: 'laptop', key: 'ssh-ed25519 AAAA', auto_add: true } });
  });

  it('fetchUserSessions uses /user_sessions and user_session namespace', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      user_sessions: [{ id: 9, label: 'phone' }],
    });

    await fetchUserSessions({ state: 'open', limit: 25 });

    const [url] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/user_sessions?');
    expect(new URL(String(url)).searchParams.get('user_session[limit]')).toBe('25');
    expect(new URL(String(url)).searchParams.get('user_session[state]')).toBe('open');
  });

  it('fetchUserSession uses /user_sessions/:id show action', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      user_session: { id: 9, label: 'phone' },
    });

    await fetchUserSession(9);

    const [url, init] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/user_sessions/9');
    expect(init?.method).toBe('GET');
  });

  it('updateUserSessionLabel sends namespaced PUT payload', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      user_session: { id: 9, label: 'work-laptop' },
    });

    await updateUserSessionLabel(9, 'work-laptop');

    const [url, init] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/user_sessions/9');
    expect(init?.method).toBe('PUT');

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ user_session: { label: 'work-laptop' } });
  });

  it('closeUserSession uses POST /user_sessions/:id with empty {} body', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({ _meta: { elapsed: 1 }, ok: true });

    await closeUserSession(9);

    const [url, init] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/user_sessions/9');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{}');
  });

  it('fetchMetricsAccessTokens uses /metrics_access_tokens and metrics_access_token namespace', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      metrics_access_tokens: [{ id: 1, metric_prefix: 'vpsadmin_' }],
    });

    await fetchMetricsAccessTokens({ limit: 10 });

    const [url] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/metrics_access_tokens?');
    expect(new URL(String(url)).searchParams.get('metrics_access_token[limit]')).toBe('10');
  });

  it('createMetricsAccessToken sends namespaced POST payload', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({
      _meta: { elapsed: 1 },
      metrics_access_token: { id: 1, metric_prefix: 'vpsadmin_', access_token: 'secret' },
    });

    await createMetricsAccessToken({ metric_prefix: 'vpsadmin_' });

    const [url, init] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/metrics_access_tokens');
    expect(init?.method).toBe('POST');

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ metrics_access_token: { metric_prefix: 'vpsadmin_' } });
  });

  it('deleteMetricsAccessToken uses DELETE /metrics_access_tokens/:id', async () => {
    setMockRuntime();
    const fetchMock = installOkFetch({ _meta: { elapsed: 1 }, ok: true });

    await deleteMetricsAccessToken(9);

    const [url, init] = getFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/metrics_access_tokens/9');
    expect(init?.method).toBe('DELETE');
  });
});
