import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { exportCreateConflict, type ExportCreateSubmissionFailure } from './exportCreateConflict';

export function ExportCreateFailure(props: {
  failure: ExportCreateSubmissionFailure;
  basePath: string;
  onLeave: () => void;
}) {
  const { t } = useI18n();
  const conflict = exportCreateConflict(props.failure);
  const error = props.failure.error;
  const href = conflict
    ? `${props.basePath}/datasets/${Number(props.failure.form.datasetId)}/${conflict.source === 'snapshot' ? 'snapshots' : 'exports'}`
    : undefined;
  return (
    <div role="alert" className="max-h-40 overflow-y-auto break-words" data-testid="exports.create.failure">
      <Alert variant="danger" title={t(conflict ? 'exports.create.conflict.title' : 'exports.create.error')}>
        {conflict ? (
          <div className="space-y-2" data-testid="exports.create.conflict">
            <p>{t(`exports.create.conflict.${conflict.source}.body`, { source: conflict.label })}</p>
            <Link
              className="text-link underline"
              to={href as string}
              onClick={props.onLeave}
              data-testid="exports.create.conflict.open"
            >
              {t(`exports.create.conflict.${conflict.source}.open`)}
            </Link>
          </div>
        ) : error instanceof Error ? (
          error.message
        ) : (
          String(error)
        )}
      </Alert>
    </div>
  );
}
