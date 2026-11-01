import { describe, expect, test, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { ApiOutputError } from './apiOutput';
import { createDnsTsigKey, fetchDnsTsigKeys } from './dnsTsigKeys';
import { fetchDnsZoneTransfers } from './dnsTransfers';

function reply(response: unknown) {
  apiWire.respond = async () => ({ status: 200, json: async () => ({ status: true, response }) });
}

describe('secret-safe generated DNS result validation', () => {
  test('scrubs list secrets before an invalid row can enter an output error receipt', async () => {
    reply({ dns_tsig_keys: [{ id: null, secret: 'list-secret' }], _meta: { secret: 'metadata-secret' } });
    const error: unknown = await fetchDnsTsigKeys().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiOutputError);
    expect(JSON.stringify(error)).not.toContain('list-secret');
    expect(JSON.stringify(error)).not.toContain('metadata-secret');
    expect(error).toMatchObject({ result: { data: [{ id: null }], httpStatus: 200 } });
  });

  test('scrubs included transfer secrets before output validation', async () => {
    reply({ dns_zone_transfers: [{ id: 9, dns_tsig_key: { id: 'bad', secret: 'included-secret' } }] });
    const error: unknown = await fetchDnsZoneTransfers().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiOutputError);
    expect(JSON.stringify(error)).not.toContain('included-secret');
  });

  test('preserves the one-time sink while scrubbing a malformed create receipt', async () => {
    reply({ dns_tsig_key: { id: null, name: 'key', secret: 'create-secret' } });
    const sink = vi.fn();
    const error: unknown = await createDnsTsigKey({ name: 'key' }, { onOneTimeSecret: sink }).catch(
      (value: unknown) => value
    );
    expect(sink).toHaveBeenCalledExactlyOnceWith({ name: 'key', secret: 'create-secret' });
    expect(error).toBeInstanceOf(ApiOutputError);
    expect(JSON.stringify(error)).not.toContain('create-secret');
  });
});
