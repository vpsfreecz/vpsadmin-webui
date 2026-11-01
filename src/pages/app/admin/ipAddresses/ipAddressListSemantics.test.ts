import { describe, expect, it } from 'vitest';
import type { Location__ShowOutput } from 'vpsadmin-typescript-client';
import { idFromResourceRef, locationMark } from './ipAddressListSemantics';

describe('partial IP inventory reference boundaries', () => {
  it.each([
    null,
    undefined,
    {},
    { id: null },
    { id: undefined },
    { id: 0 },
    { id: 1.5 },
    { id: -1 },
    { id: Number.MAX_SAFE_INTEGER + 1 },
  ])('does not invent an identity for %j', (value) => {
    expect(idFromResourceRef(value)).toBeNull();
  });

  it('reads an actual positive interface identity without requiring a full resource', () => {
    expect(idFromResourceRef({ id: 51, name: null })).toBe(51);
    expect(idFromResourceRef({ id: '51' })).toBe(51);
  });

  it('narrows only real labels from a generated partial location fallback', () => {
    const partial: Location__ShowOutput = { label: 'Praha', environment: { id: 9 } };
    expect(locationMark({ id: 1 }, partial)).toEqual({ code: 'PRG', label: 'Praha' });
    expect(locationMark({ id: 1 }, { environment: { label: 'Production' } })).toEqual({
      code: 'PRO',
      label: 'Production',
    });
    expect(locationMark({ id: 1 }, { environment: { id: 9, label: 42 } })).toBeNull();
    expect(locationMark({ id: 1 }, { label: null, environment: null })).toBeNull();
  });
});
