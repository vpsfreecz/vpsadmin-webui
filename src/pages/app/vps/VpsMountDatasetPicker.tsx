import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import { buttonClassName } from '../../../components/ui/buttonStyles';
import { Input } from '../../../components/ui/Input';
import { fetchDatasets, findDatasetByName, type Dataset } from '../../../lib/api/datasets';
import { getMetaTotalCount } from '../../../lib/api/haveapi';
import { datasetLabel, type MountDraft } from './VpsStorageModel';
import {
  completeMountDatasetSnapshot,
  MOUNT_DATASET_LIMIT,
  mountDatasetMatches,
  mountDatasetPage,
} from './mountDatasetPickerModel';

export function VpsMountDatasetPicker(props: {
  root: Dataset | undefined;
  ownerId: number | null;
  supported: boolean;
  admin: boolean;
  selected: MountDraft['dataset'];
  onSelect: (dataset: Dataset | null) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [exactName, setExactName] = useState('');
  const [candidate, setCandidate] = useState<Dataset | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = props.root;
  const ownerId = props.ownerId;
  const ready = props.supported && !!root?.full_name && ownerId !== null;
  const list = useQuery({
    queryKey: ['datasets', 'mount-picker', root?.id, ownerId, props.admin],
    enabled: open && ready,
    queryFn: () =>
      fetchDatasets({
        subtree: root!.id,
        user: props.admin ? ownerId! : undefined,
        role: 'hypervisor',
        limit: MOUNT_DATASET_LIMIT,
        count: true,
        includes: 'user',
      }),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const complete =
    !!list.data && completeMountDatasetSnapshot(list.data.data.length, getMetaTotalCount(list.data.meta));
  const valid = (dataset: Dataset) => !!root && ownerId !== null && mountDatasetMatches(dataset, root, ownerId);
  const exact = useQuery({
    queryKey: ['datasets', 'mount-picker-exact', root?.id, ownerId, props.admin, exactName],
    enabled: open && ready && !complete && !!list.data && !!exactName,
    queryFn: async () => {
      const found = (await findDatasetByName(exactName, props.admin ? ownerId! : undefined)).data;
      if (!valid(found) || found.full_name !== exactName) return null;
      // Recheck pool role through the same authorized index, even when the
      // original root snapshot was too large to include this dataset.
      const scoped = await fetchDatasets({
        subtree: found.id,
        user: props.admin ? ownerId! : undefined,
        role: 'hypervisor',
        limit: 1,
        includes: 'user',
      });
      return scoped.data.find((dataset) => dataset.id === found.id && valid(dataset)) ?? null;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
  const candidates = complete
    ? list.data!.data.filter(valid)
    : exactName === search.trim() &&
        exact.data &&
        !exact.isFetching &&
        !exact.isError &&
        exact.data.full_name === exactName &&
        valid(exact.data)
      ? [exact.data]
      : [];
  const result = mountDatasetPage(candidates, complete ? search : '', page);
  const failed = list.isError || exact.isError;
  const loading = list.isFetching || (!complete && exact.isFetching);
  const canChoose = ready && !failed && !loading && !!candidate && candidates.some((item) => item.id === candidate.id);
  const close = () => {
    setOpen(false);
    setCandidate(null);
    trigger.current?.focus();
  };

  return (
    <div className="space-y-2" data-testid="vps.storage.dataset_picker">
      <div className="text-xs font-medium text-muted">{t('vps.storage.dataset_find.label')}</div>
      {props.selected ? (
        <div className="break-all text-sm" data-testid="vps.storage.dataset_picker.selected">
          {datasetLabel(props.selected)}
        </div>
      ) : null}
      <button
        ref={trigger}
        type="button"
        className={buttonClassName({ variant: 'secondary' })}
        data-testid="vps.storage.dataset_picker.open"
        aria-expanded={open}
        onClick={() => {
          props.onSelect(null);
          setCandidate(null);
          setSearch('');
          setExactName('');
          setPage(0);
          setOpen(true);
        }}
      >
        {t(props.selected ? 'vps.storage.dataset_picker.change' : 'vps.storage.dataset_picker.open')}
      </button>
      {open ? (
        <section
          className="space-y-3 rounded-md border border-border p-3"
          aria-label={t('vps.storage.dataset_picker.open')}
        >
          {!ready ? (
            <p className="text-sm text-muted">{t('vps.storage.dataset_picker.unavailable')}</p>
          ) : (
            <>
              {!list.isPending && !complete && !list.isError ? (
                <p className="text-sm text-muted">{t('vps.storage.dataset_picker.limited')}</p>
              ) : null}
              <label className="block space-y-1">
                <span className="text-sm">
                  {t(complete ? 'vps.storage.dataset_picker.search' : 'vps.storage.dataset_picker.exact')}
                </span>
                <Input
                  testId="vps.storage.dataset_picker.search"
                  value={search}
                  autoComplete="off"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCandidate(null);
                    setExactName('');
                    setPage(0);
                  }}
                />
              </label>
              {!complete && list.data ? (
                <Button
                  variant="secondary"
                  disabled={!search.trim()}
                  onClick={() => {
                    setCandidate(null);
                    setExactName(search.trim());
                  }}
                  testId="vps.storage.dataset_picker.find"
                >
                  {t('common.find')}
                </Button>
              ) : null}
              {loading ? (
                <p role="status">{t('common.loading')}</p>
              ) : failed ? (
                <div role="alert" className="space-y-2 text-sm text-danger">
                  <p>{t('vps.storage.dataset_picker.error')}</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCandidate(null);
                      void (list.isError ? list.refetch() : exact.refetch());
                    }}
                  >
                    {t('common.retry')}
                  </Button>
                </div>
              ) : (
                <>
                  {result.items.length === 0 && (complete || !!exactName) ? (
                    <p role="status" className="text-sm text-muted">
                      {t('vps.storage.dataset_picker.empty')}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {result.items.map((dataset) => (
                      <button
                        key={dataset.id}
                        type="button"
                        data-testid={`vps.storage.dataset_picker.candidate.${dataset.id}`}
                        aria-pressed={candidate?.id === dataset.id}
                        onClick={() => setCandidate(dataset)}
                        className={`min-h-11 w-full break-all rounded-md border p-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-focus ${candidate?.id === dataset.id ? 'border-accent bg-surface-2' : 'border-border bg-surface'}`}
                      >
                        {dataset.full_name}
                      </button>
                    ))}
                  </div>
                  {result.pages > 1 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        disabled={result.currentPage === 0}
                        onClick={() => {
                          setCandidate(null);
                          setPage(result.currentPage - 1);
                        }}
                        testId="vps.storage.dataset_picker.previous"
                      >
                        {t('pagination.prev')}
                      </Button>
                      <span className="text-sm">
                        {t('vps.storage.dataset_picker.page', { page: result.currentPage + 1, pages: result.pages })}
                      </span>
                      <Button
                        variant="secondary"
                        disabled={result.currentPage + 1 >= result.pages}
                        onClick={() => {
                          setCandidate(null);
                          setPage(result.currentPage + 1);
                        }}
                        testId="vps.storage.dataset_picker.next"
                      >
                        {t('pagination.next')}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!canChoose}
              testId="vps.storage.dataset_picker.choose"
              onClick={() => {
                if (canChoose && candidate) {
                  props.onSelect(candidate);
                  close();
                }
              }}
            >
              {t('vps.storage.dataset_picker.choose')}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
