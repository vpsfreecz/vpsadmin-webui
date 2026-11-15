import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import { LookupCombobox } from '../../../components/ui/LookupCombobox';
import { fetchDatasets, type Dataset } from '../../../lib/api/datasets';
import { getMetaTotalCount } from '../../../lib/api/haveapi';
import { exportDatasetMatchesRequiredOwner, parsePositiveInt, resourceLabel } from './ExportModel';

const DATASET_LIMIT = 1000;

export function ExportDatasetPicker(props: {
  value: string;
  onChange: (datasetId: string) => void;
  open: boolean;
  pending: boolean;
  isAdmin: boolean;
  accountId: number | undefined;
  requiresOwnDataset: boolean;
  requiredDatasetOwnerId: number | undefined;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(props.value ? `#${props.value}` : '');
  const [expanded, setExpanded] = useState(false);
  const committedId = useRef(props.value);
  const ownerRequired = !props.isAdmin || props.requiresOwnDataset;
  const ownerId = props.isAdmin ? props.requiredDatasetOwnerId : props.accountId;
  const scopeReady = !ownerRequired || ownerId !== undefined;

  useEffect(() => {
    if (props.value !== committedId.current) {
      committedId.current = props.value;
      setText(props.value ? `#${props.value}` : '');
      setExpanded(false);
    }
  }, [props.value]);

  const datasets = useQuery({
    queryKey: ['datasets', 'export-picker', props.accountId, props.isAdmin, props.requiresOwnDataset, ownerId],
    enabled: props.open && scopeReady,
    queryFn: () =>
      fetchDatasets({
        limit: DATASET_LIMIT,
        includes: 'user',
        count: true,
        user: props.isAdmin && props.requiresOwnDataset ? ownerId : undefined,
      }),
    staleTime: 15_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const options = useMemo(() => {
    if (!scopeReady || datasets.isFetching || datasets.isError) return [];
    const exactId = text.trim().startsWith('#');
    const search = text.trim().replace(/^#/, '').toLocaleLowerCase();
    const seen = new Set<number>();
    return (datasets.data?.data ?? [])
      .filter((dataset) => {
        if (seen.has(dataset.id) || (ownerRequired && !exportDatasetMatchesRequiredOwner(dataset, ownerId)))
          return false;
        seen.add(dataset.id);
        return (
          !search ||
          (!exactId && resourceLabel(dataset).toLocaleLowerCase().includes(search)) ||
          String(dataset.id) === search
        );
      })
      .map((dataset) => ({
        id: dataset.id,
        value: dataset,
        title: resourceLabel(dataset),
        detail:
          props.isAdmin && !props.requiresOwnDataset ? String(dataset.user?.['login'] ?? '') || undefined : undefined,
      }));
  }, [
    datasets.data,
    datasets.isError,
    datasets.isFetching,
    ownerId,
    ownerRequired,
    props.isAdmin,
    props.requiresOwnDataset,
    scopeReady,
    text,
  ]);
  const total = getMetaTotalCount(datasets.data?.meta);
  const incomplete = !!datasets.data && (total === undefined || total !== datasets.data.data.length);

  function select(dataset: Dataset) {
    committedId.current = String(dataset.id);
    props.onChange(committedId.current);
    setText(resourceLabel(dataset));
  }

  return (
    <div className="space-y-2" data-testid="exports.create.dataset_picker">
      <LookupCombobox
        value={text}
        onChange={(value) => {
          setText(value);
          // A numeric dataset name is a name. Only an explicit #ID bypasses picking.
          const id = value.trim().startsWith('#') ? parsePositiveInt(value) : null;
          committedId.current = id === null ? '' : String(id);
          props.onChange(committedId.current);
        }}
        onPick={select}
        open={expanded}
        onOpenChange={setExpanded}
        showSuggestions
        options={options}
        busy={datasets.isFetching}
        failed={datasets.isError || !scopeReady}
        disabled={props.pending || !scopeReady}
        placeholder={t('exports.form.dataset.placeholder')}
        ariaLabel={t('common.dataset')}
        testId="exports.create.dataset"
        wrapOptions
      />
      {props.value ? (
        <p className="text-xs text-muted" data-testid="exports.create.dataset_picker.selected_id">
          {t('exports.form.dataset.id', { id: props.value })}
        </p>
      ) : null}
      <p className="text-xs text-muted">{t('exports.form.dataset.help')}</p>
      {incomplete ? (
        <p className="text-xs text-muted" data-testid="exports.create.dataset_picker.limited">
          {t('exports.form.dataset.limited')}
        </p>
      ) : null}
      {datasets.isError ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-danger" role="alert">
          <span>{t('exports.form.dataset.list_error')}</span>
          <Button
            variant="secondary"
            onClick={() => void datasets.refetch()}
            testId="exports.create.dataset_picker.retry"
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
