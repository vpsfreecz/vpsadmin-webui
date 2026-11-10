import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { DatasetUsage } from './DatasetUsage';
import type { Dataset } from '../../../lib/api/datasets';
import { formatMiB } from '../../../lib/format';

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function objectId(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null;
  const id = value.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

export function DatasetSpaceCard(props: { dataset: Dataset }) {
  const { t } = useI18n();

  const used = asNumber(props.dataset.used);
  const available = asNumber(props.dataset.avail);
  const referenced = asNumber(props.dataset.referenced);

  return (
    <Card testId="dataset.overview.space">
      <CardHeader title={t('dataset.overview.space.title')} />
      <CardBody>
        <DatasetUsage showUnlimitedUsage={false} used={used} referenced={referenced} quota={props.dataset.quota} refquota={props.dataset.refquota} />
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {[
            [t('dataset.field.used'), used],
            [t('dataset.field.available'), available],
            [t('dataset.field.referenced'), referenced],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-faint">{label}</div>
              <div className="font-medium text-fg">{typeof value === 'number' ? formatMiB(value) : t('common.na')}</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function DatasetTemporaryExpansionCard(props: { dataset: Dataset; destination: string }) {
  const { t } = useI18n();
  const expansionId = objectId(props.dataset['dataset_expansion']);

  return (
    <Card testId="dataset.overview.expansion">
      <CardHeader
        title={t('dataset.overview.expansion.title')}
        subtitle={
          expansionId
            ? t('dataset.overview.expansion.subtitle_active')
            : t('dataset.overview.expansion.subtitle')
        }
        actions={
          <Button to={props.destination} size="sm" testId="dataset.overview.expansion.open">
            {expansionId ? t('dataset.overview.expansion.open') : t('dataset.overview.expansion.create')}
          </Button>
        }
      />
      <CardBody>
        <div className="space-y-3 text-sm text-muted">
          <p>{t('dataset.overview.expansion.body')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={expansionId ? 'warn' : 'neutral'}>
              {expansionId ? t('dataset.overview.expansion.active') : t('dataset.overview.expansion.none')}
            </Badge>
            {expansionId ? <span className="text-xs text-faint">#{expansionId}</span> : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
