import { describe, expect, it } from 'vitest';
import { isOperationsReference } from './operationsReference';

describe('included operations references', () => {
  it.each([
    {},
    { id: null },
    { label: 'Partial' },
    { id: 7, login: null, name: undefined },
    { id: Number.MAX_SAFE_INTEGER },
  ])('preserves partial reference %j', (value) => {
    expect(isOperationsReference(value)).toBe(true);
  });
  it.each([
    null,
    undefined,
    [],
    7,
    { id: 0 },
    { id: -1 },
    { id: 1.5 },
    { id: Number.MAX_SAFE_INTEGER + 1 },
    { id: '7' },
  ])('rejects invalid reference identity/container %j', (value) => {
    expect(isOperationsReference(value)).toBe(false);
  });
  it.each([
    'label',
    'description',
    'domain',
    'login',
    'full_name',
    'name',
    'domain_name',
    'fqdn',
    'hostname',
    'api_ip_addr',
  ])('uses the same nullable text rule for %s', (key) => {
    expect(isOperationsReference({ [key]: null })).toBe(true);
    expect(isOperationsReference({ [key]: '' })).toBe(true);
    expect(isOperationsReference({ [key]: false })).toBe(false);
    expect(isOperationsReference({ [key]: { id: 7 } })).toBe(false);
  });
  it('leaves unrelated extension fields to their owning domain', () => {
    expect(isOperationsReference({ custom: { value: false }, min: 'domain validation required' })).toBe(true);
  });
});
