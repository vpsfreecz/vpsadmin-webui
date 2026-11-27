import { describe, expect, test } from 'vitest';

import { normalizeLegacyNetworkSearch } from './networkFilterSemantics';

describe('cluster network filter semantics', () => {
  test('removes unsupported filters and their stale cursor as one canonical transition', () => {
    const result = normalizeLegacyNetworkSearch(
      new URLSearchParams(
        'q=public&ip_version=4&role=public_access&managed=true&location=1&purpose=vps&limit=25&from_id=99&page=2'
      )
    );

    expect(result.changed).toBe(true);
    expect(result.searchParams.toString()).toBe('location=1&purpose=vps&limit=25&page=1');
  });

  test('leaves supported filters and pagination untouched', () => {
    const source = new URLSearchParams('location=2&purpose=export&limit=50&from_id=200&page=3');
    const result = normalizeLegacyNetworkSearch(source);

    expect(result.changed).toBe(false);
    expect(result.searchParams.toString()).toBe(source.toString());
  });
});


test.each([
  ['location=-1&purpose=invalid&limit=25&from_id=99&page=2&keep=yes', 'limit=25&page=1&keep=yes'],
  ['location=0002&purpose=%20vps%20&from_id=99&page=2', 'location=2&purpose=vps&page=1'],
  ['location=&purpose=&from_id=99&page=2', 'page=1'],
])('canonicalizes supported filter values without leaving a stale cursor: %s', (input, expected) => {
  const result = normalizeLegacyNetworkSearch(new URLSearchParams(input));
  expect(result.changed).toBe(true);
  expect(result.searchParams.toString()).toBe(expected);
});
