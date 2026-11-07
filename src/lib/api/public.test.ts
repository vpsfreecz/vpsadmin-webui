import { installHaveApiXhr } from '../../test/haveapiXhr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchContextualHelpBoxes } from './helpBoxes';
import { fetchNews, fetchOutages, fetchPublicStats, fetchPublicSecurityAdvisories } from './public';

function makeOkResponse(response: unknown) {
  return new Response(JSON.stringify({ status: true, response }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetch() {
  const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
    const [url] = args;
    const href = String(url);

    if (href.endsWith('/cluster/public_stats')) {
      return makeOkResponse({ cluster: { user_count: 1, vps_count: 2, ipv4_left: 3 } });
    }

    if (href.includes('/outages?')) {
      return makeOkResponse({ outages: [] });
    }

    if (href.includes('/news_logs?')) {
      return makeOkResponse({ news_logs: [] });
    }

    if (href.includes('/security_advisories?')) {
      return makeOkResponse({ security_advisories: [
        ...Array.from({ length: 7 }, (_, i) => ({ id: i + 1, state: 'published', published_at: `2026-01-0${i + 1}T00:00:00Z` })),
        { id: 99, state: 'draft', published_at: '2027-01-01T00:00:00Z' },
        { id: 98, state: 'retracted', published_at: '2027-01-01T00:00:00Z' },
      ] });
    }

    if (href.includes('/help_boxes?')) {
      return makeOkResponse({ help_boxes: [] });
    }

    throw new Error(`unexpected fetch ${href}`);
  });

  installHaveApiXhr( fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.vpsAdmin = undefined;
});

describe('public API helpers', () => {
  it('loads public data without downloading the HaveAPI description', async () => {
    window.vpsAdmin = {
      api: { url: 'https://api.example.test', version: 'v7.0' },
      sessionToken: 'must-not-leak-to-public-help',
    };
    const fetchMock = installFetch();

    await fetchPublicStats();
    await fetchOutages({ limit: 25 });
    await fetchNews({ limit: 5 });
    const preview = await fetchPublicSecurityAdvisories();
    expect(preview.data.map(row => row.id)).toEqual([7, 6, 5, 4, 3]);
    await fetchContextualHelpBoxes('public', 'index', 'public');

    expect(fetchMock).toHaveBeenCalledTimes(5);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual([
      'https://api.example.test/v7.0/cluster/public_stats',
      'https://api.example.test/v7.0/outages?outage[limit]=25',
      'https://api.example.test/v7.0/news_logs?news_log[limit]=5',
      'https://api.example.test/v7.0/security_advisories?security_advisory[limit]=5&security_advisory[order]=newest&security_advisory[state]=published',
      'https://api.example.test/v7.0/help_boxes?help_box[action]=index&help_box[page]=public&help_box[view]=true',
    ]);

    expect(urls.some((url) => url === 'https://api.example.test/v7.0' || url === 'https://api.example.test/v7.0/')).toBe(false);
    expect(urls.some((url) => url === 'https://api.example.test' || url === 'https://api.example.test/')).toBe(false);

    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('X-HaveAPI-Auth-Token')).toBeNull();
      expect(headers.get('Authorization')).toBeNull();
    }
  });

  it('loads contextual help through the authenticated client with the configured exact header', async () => {
    window.vpsAdmin = {
      api: { url: 'https://api.example.test', version: 'v7.0' },
      sessionToken: 'exact-session-token',
      webuiNext: {
        haveApi: {
          authHeader: 'X-Configured-Auth-Header',
          metaNamespace: '_meta',
        },
      },
    };
    const fetchMock = installFetch();

    await fetchContextualHelpBoxes('vps', 'show', 'authenticated');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      'https://api.example.test/v7.0/help_boxes?help_box[action]=show&help_box[page]=vps&help_box[view]=true'
    );
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Configured-Auth-Header')).toBe('exact-session-token');
    expect(headers.get('X-HaveAPI-Auth-Token')).toBeNull();
  });
});
