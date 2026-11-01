import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, type RequestExecutor } from 'vpsadmin-typescript-client';
import * as sdk from './sdk';
import { ClientInputError, isAmbiguousMutationError } from './apiErrors';
import { ApiOutputError } from './apiOutput';
import {
  createNode,
  fetchNode,
  fetchNodeCreateCapability,
  fetchNodes,
  NodeCreateIndeterminateError,
  updateNode,
} from './nodes';

const execute = vi.fn<RequestExecutor>();
const api = createClient({ execute });
const receipt = (data: unknown) => ({
  data,
  meta: { total_count: 0, extension: true },
  envelope: { status: true, response: { exact: data } },
  httpStatus: 200,
});
beforeEach(() => {
  execute.mockReset();
  vi.spyOn(sdk, 'getApi').mockResolvedValue(api);
});
afterEach(() => {
  vi.restoreAllMocks();
});
describe('node generated operation boundary', () => {
  it('retains null/absence and partial locations without manufacturing association ids', async () => {
    const result = receipt([{ id: 7, name: null, active: false, max_vps: 0, location: { label: 'Partial' } }]);
    execute.mockResolvedValue(result);
    const page = await fetchNodes({ limit: 0, includes: 'location' });
    expect(page.data[0]).toMatchObject({
      id: 7,
      name: null,
      active: false,
      max_vps: 0,
      location: { label: 'Partial' },
    });
    expect(page.data[0]?.location).not.toHaveProperty('id');
    expect(page.envelope).toBe(result.envelope);
    expect(page.meta).toEqual(result.meta);
    expect(page.httpStatus).toBe(200);
  });
  it('makes malformed post-dispatch identity uncertain and retains the receipt', async () => {
    const result = receipt({ id: null });
    execute.mockResolvedValue(result);
    const error = await fetchNode(7).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiOutputError);
    expect(error).toMatchObject({ result });
    expect(isAmbiguousMutationError(error)).toBe(true);
  });
  it('classifies generated local validation before node create as definitive with zero sends', async () => {
    const error = await createNode({
      name: 'node',
      location: Number.MAX_SAFE_INTEGER + 1,
      ip_addr: '192.0.2.1',
      type: 'node',
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ClientInputError);
    expect(error).not.toBeInstanceOf(NodeCreateIndeterminateError);
    expect(execute).not.toHaveBeenCalled();
  });
  it('rejects null limits before dispatch while preserving zero and false', async () => {
    // @ts-expect-error The recorded generated input forbids null, even if hypothetical live metadata permits it.
    await expect(updateNode(7, { max_vps: null })).rejects.toBeInstanceOf(ClientInputError);
    expect(execute).not.toHaveBeenCalled();
    execute.mockResolvedValue(receipt({}));
    await updateNode(7, { max_vps: 0, active: false });
    expect(execute).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ params: { max_vps: 0, active: false } }));
  });
  it('rejects malformed live capability fields with the original description receipt', async () => {
    const result = receipt({ input: { parameters: { cpus: { required: 'yes' } } } });
    execute.mockResolvedValue(result);
    await expect(fetchNodeCreateCapability()).rejects.toMatchObject({ phase: 'post-dispatch', result });
    expect(execute).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ method: 'OPTIONS', path: '/nodes?method=POST' })
    );
  });
});
