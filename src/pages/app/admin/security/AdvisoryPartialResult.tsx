import { useI18n } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { formatErrorMessage } from '../../../../lib/errors';
import type { AdvisoryChildSequenceError } from './securityAdvisoryAdminApi';

export interface AdvisoryPartialResult {
  advisoryId: number;
  desiredCves: readonly string[];
  sequenceError: AdvisoryChildSequenceError;
}

/** Accepted child sends are retained even when their subsequent read-back failed. */
export function AdvisoryPartialResult({
  result,
  created = false,
  onReview,
}: {
  result: AdvisoryPartialResult;
  created?: boolean;
  onReview?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Alert variant="warn" title={t('admin.security_advisories.cve_changes.title')}>
      <div className="space-y-2" data-testid="admin.security_advisories.partial">
        <div>
          {t(
            created
              ? 'admin.security_advisories.toast.created_without_cves'
              : 'admin.security_advisories.toast.saved_without_cves'
          )}{' '}
          #{result.advisoryId}
        </div>
        <div data-testid="admin.security_advisories.partial.desired">
          {t('admin.security_advisories.cve_changes.requested')}: {result.desiredCves.join(', ')}
        </div>
        <div data-testid="admin.security_advisories.partial.accepted">
          {t('admin.security_advisories.cve_changes.accepted')}: {result.sequenceError.completed.join(', ') || '—'}
        </div>
        <div data-testid="admin.security_advisories.partial.remaining">
          {t('admin.security_advisories.cve_changes.remaining')}: {result.sequenceError.remaining.join(', ') || '—'}
        </div>
        <div>{formatErrorMessage(result.sequenceError.originalError)}</div>
        <div>{t('admin.security_advisories.cve_changes.body')}</div>
        <Button
          to={`/admin/security-advisories/${result.advisoryId}`}
          onClick={onReview}
          variant="secondary"
          size="sm"
          testId="admin.security_advisories.partial.open"
        >
          {t('admin.security_advisories.cve_changes.review')}
        </Button>
      </div>
    </Alert>
  );
}
