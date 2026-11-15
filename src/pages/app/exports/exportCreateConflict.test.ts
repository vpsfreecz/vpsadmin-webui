import { describe, expect, it } from 'vitest';
import { HaveApiError } from '../../../lib/api/apiErrors';
import { defaultCreateForm } from './ExportModel';
import { exportCreateConflict } from './exportCreateConflict';

function rejected(message = 'dataset tank/member/archive is already exported', httpStatus?: number) {
  return new HaveApiError({ status: false, response: null, message, errors: {} }, 'Request failed', httpStatus, {
    method: 'POST',
    path: '/exports',
  });
}
describe('verified export Create collision receipts', () => {
  it('recognizes the real dev HTTP200 statusfalse dataset receipt', () => {
    expect(exportCreateConflict({ error: rejected(), form: defaultCreateForm(89) })).toEqual({
      source: 'dataset',
      label: 'tank/member/archive',
    });
  });
  it('keeps a snapshot collision bound to its submitted snapshot source', () => {
    const form = { ...defaultCreateForm(89, 101), sourceType: 'snapshot' as const };
    expect(
      exportCreateConflict({ error: rejected('snapshot tank/member/archive@backup-a is already exported'), form })
    ).toEqual({ source: 'snapshot', label: 'tank/member/archive@backup-a' });
  });
  it.each([401, 403, 404, 408, 425, 429, 500, 502])('does not turn HTTP%s into the verified collision', (status) => {
    expect(exportCreateConflict({ error: rejected(undefined, status), form: defaultCreateForm(89) })).toBeNull();
  });
  it.each(['dataset not found', 'insufficient permission', 'This dataset cannot be exported or mounted via vpsAdmin'])(
    'retains a different API rejection: %s',
    (message) => {
      expect(exportCreateConflict({ error: rejected(message), form: defaultCreateForm(89) })).toBeNull();
    }
  );
  it('does not classify a dataset lookup as a Create conflict', () => {
    const error = rejected();
    error.request = { method: 'GET', path: '/datasets/89' };
    expect(exportCreateConflict({ error, form: defaultCreateForm(89) })).toBeNull();
  });
  it.each([new Error('dataset tank/member/archive is already exported'), new TypeError('Failed to fetch')])(
    'retains a transport or ordinary error',
    (error) => {
      expect(exportCreateConflict({ error, form: defaultCreateForm(89) })).toBeNull();
    }
  );
  it('rejects a malformed error envelope', () => {
    const error = rejected();
    error.envelope.errors = 'MALFORMED_HAVEAPI_ENVELOPE';
    expect(exportCreateConflict({ error, form: defaultCreateForm(89) })).toBeNull();
  });
  it('requires the matching submitted source and valid IDs', () => {
    expect(exportCreateConflict({ error: rejected(), form: defaultCreateForm(89, 101) })).toBeNull();
    expect(
      exportCreateConflict({ error: rejected('snapshot a@b is already exported'), form: defaultCreateForm(89) })
    ).toBeNull();
    expect(exportCreateConflict({ error: rejected(), form: defaultCreateForm(null) })).toBeNull();
  });
});
