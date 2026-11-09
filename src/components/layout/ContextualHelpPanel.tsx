import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleHelp } from 'lucide-react';

import { useAuth } from '../../app/auth';
import { useI18n } from '../../app/i18n';
import { useTheme } from '../../app/theme';
import { usePageHelpRegistry } from '../../app/pageHelp';
import { fetchContextualHelpBoxes, type ContextualHelpAccessMode } from '../../lib/api/helpBoxes';
import { buildHelpBoxesManageUrl, resolveHelpBoxContext, type HelpBoxScope } from '../../lib/helpBoxContext';
import { Button } from '../ui/Button';
import { buttonClassName } from '../ui/buttonStyles';
import { Modal } from '../ui/Modal';
import { SandboxedHtml } from '../ui/SandboxedHtml';

/** One route-aware controller; shared headings provide presentation anchors only. */
export function ContextualHelpPanel(props: { pathname: string; scope: HelpBoxScope }) {
  const { t } = useI18n();
  const auth = useAuth();
  const theme = useTheme();
  const registry = usePageHelpRegistry();
  const setAvailable = registry?.setAvailable;
  const [open, setOpen] = useState(false);
  const ctx = useMemo(() => resolveHelpBoxContext(props.pathname, props.scope), [props.pathname, props.scope]);
  const accessMode: ContextualHelpAccessMode | null = auth.status === 'authenticated'
    ? 'authenticated' : auth.status === 'anonymous' ? 'public' : null;
  const q = useQuery({
    queryKey: ['help_boxes', 'view', props.scope, ctx?.page ?? null, ctx?.action ?? null, accessMode],
    enabled: Boolean(ctx?.page && ctx?.action && accessMode),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async () => (await fetchContextualHelpBoxes(ctx!.page, ctx!.action, accessMode!)).data,
  });
  const boxes = useMemo(() => (q.data ?? [])
    .filter(box => typeof box.content === 'string' && box.content.trim().length > 0)
    .slice().sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)), [q.data]);
  const available = Boolean(ctx && accessMode && !q.isError && boxes.length > 0);
  useEffect(() => { setOpen(false); }, [props.pathname, props.scope]);
  useEffect(() => {
    setAvailable?.(available);
    if (!available) setOpen(false);
    return () => setAvailable?.(false);
  }, [available, setAvailable]);

  if (!ctx || !available) return null;
  const canManage = auth.status === 'authenticated' && auth.canUseAdminUi;
  const heading = registry?.heading;
  const close = () => setOpen(false);
  return (
    <>
      {heading ? createPortal(
        <button
          type="button"
          data-testid="contextual.help.toggle"
          title={t('help_boxes.panel.title')}
          aria-label={t('help_boxes.panel.title')}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={buttonClassName({ variant: 'ghost', size: 'sm', className: 'w-9 shrink-0 px-0 text-muted hover:text-fg' })}
          onClick={event => {
            // Safari touch activation does not focus buttons by default.
            event.currentTarget.focus({ preventScroll: true });
            setOpen(true);
          }}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        </button>, heading) : null}
      <Modal
        open={open}
        onClose={close}
        title={t('help_boxes.panel.title')}
        size="lg"
        showCloseButton
        closeTestId="contextual.help.close"
        testId="contextual.help.dialog"
        footer={<div className="flex justify-end"><Button variant="secondary" size="sm" testId="contextual.help.done" onClick={close}>{t('common.close')}</Button></div>}
      >
        {canManage ? (
          <div className="mb-3 flex justify-end">
            <Button to={buildHelpBoxesManageUrl(ctx)} onClick={close} variant="ghost" size="sm" className="text-muted hover:text-fg" testId="contextual.help.manage">
              {t('help_boxes.panel.manage')}
            </Button>
          </div>
        ) : null}
        <div className="space-y-3">
          {boxes.map(box => (
            <div key={box.id} data-testid={`contextual.help.box.${box.id}`}>
              <SandboxedHtml
                html={box.content!}
                title={t('help_boxes.panel.iframe_title', { id: box.id })}
                autoHeight
                variant="helpBox"
                theme={theme.effective}
                className="min-h-0"
                onEscape={close}
              />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
