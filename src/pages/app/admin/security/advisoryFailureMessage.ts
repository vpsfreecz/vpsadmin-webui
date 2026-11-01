import { AdvisoryWriteError } from '../../../../lib/api/securityAdvisoryMutations';
import { formatErrorMessage } from '../../../../lib/errors';
export function advisoryFailureMessage(error: unknown, t: (key: string) => string): string {
  return error instanceof AdvisoryWriteError
    ? t(`admin.security_advisories.correction.${error.kind}`)
    : formatErrorMessage(error);
}
