import { HaveApiError, isAmbiguousMutationError } from '../../../lib/api/apiErrors';
import { parsePositiveInt, type CreateExportFormState } from './ExportModel';

export type ExportCreateSubmissionFailure = {
  error: unknown;
  form: Pick<CreateExportFormState, 'datasetId' | 'snapshotId' | 'sourceType'>;
};

// Match only the definitive Create rejection verified against isolated dev API.
// Lookup, permission, protocol and uncertain failures must retain their meaning.
export function exportCreateConflict(failure: ExportCreateSubmissionFailure) {
  const { error, form } = failure;
  if (
    !(error instanceof HaveApiError) ||
    isAmbiguousMutationError(error) ||
    error.httpStatus !== undefined ||
    error.envelope.status !== false ||
    error.envelope.response !== null ||
    error.request?.method !== 'POST' ||
    error.request.path !== '/exports' ||
    parsePositiveInt(form.datasetId) === null
  )
    return null;
  const errors = error.envelope.errors;
  if (
    errors !== null &&
    errors !== undefined &&
    (typeof errors !== 'object' || Array.isArray(errors) || Object.keys(errors).length !== 0)
  )
    return null;
  const source = form.sourceType;
  if (source === 'snapshot' && parsePositiveInt(form.snapshotId) === null) return null;
  const match = (
    source === 'snapshot'
      ? /^snapshot ([^\r\n]+@[^\r\n]+) is already exported$/
      : /^dataset ([^\r\n]+) is already exported$/
  ).exec(error.message);
  return match ? { source, label: match[1] as string } : null;
}
