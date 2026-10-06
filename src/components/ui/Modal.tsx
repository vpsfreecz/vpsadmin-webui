import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from './clsx';

import { useBodyScrollLock } from '../../lib/hooks/useBodyScrollLock';
import { useOverlayViewport } from '../../lib/hooks/useOverlayViewport';
import { useFocusTrap } from '../../lib/hooks/useFocusTrap';

export function Modal(props: {
  open: boolean;
  title?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * When enabled, the modal becomes full-screen on small viewports.
   * This is used by mobile-first surfaces like the command palette.
   */
  mobileFullScreen?: boolean;

  /** Optional test id for E2E / integration tests */
  testId?: string;
}) {
  const { open, onClose } = props;
  useBodyScrollLock(open);
  const viewportStyle = useOverlayViewport(props.open);

  const titleId = useId();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  useFocusTrap(props.open, containerEl);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        const target =
          e.target instanceof Element ? e.target.closest('[data-overlay="modal"], [data-overlay="drawer"]') : null;
        const dialogs = document.querySelectorAll('[aria-modal="true"]');
        if ((target ?? dialogs.item(dialogs.length - 1)) !== containerEl) return;
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [containerEl, open, onClose]);

  if (!props.open) return null;

  const mobileFullScreen = Boolean(props.mobileFullScreen);

  const sizeClass =
    props.size === 'sm'
      ? mobileFullScreen
        ? 'max-w-none sm:max-w-sm'
        : 'max-w-sm'
      : props.size === 'xl'
        ? mobileFullScreen
          ? 'max-w-none sm:max-w-6xl'
          : 'max-w-6xl'
        : props.size === 'lg'
          ? mobileFullScreen
            ? 'max-w-none sm:max-w-3xl'
            : 'max-w-3xl'
          : mobileFullScreen
            ? 'max-w-none sm:max-w-xl'
            : 'max-w-xl';

  return createPortal(
    <div
      style={viewportStyle}
      className={clsx('fixed inset-0 z-50 flex items-center justify-center', mobileFullScreen ? 'p-0 sm:p-4' : 'p-4')}
    >
      <div
        className="absolute inset-0 bg-backdrop/45"
        data-overlay-backdrop="true"
        onClick={props.onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title ? undefined : props.ariaLabel}
        aria-labelledby={props.title ? titleId : undefined}
        data-testid={props.testId}
        data-overlay="modal"
        data-overlay-surface="overlay"
        tabIndex={-1}
        ref={setContainerEl}
        className={clsx(
          'relative z-10 flex w-full flex-col overflow-hidden bg-overlay-surface shadow-panel ring-1 ring-border',
          mobileFullScreen
            ? 'h-full max-h-full rounded-none sm:h-auto sm:max-h-modal sm:rounded-lg'
            : 'max-h-modal rounded-lg',
          sizeClass
        )}
      >
        {props.title ? (
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="text-base font-semibold" id={titleId}>
              {props.title}
            </div>
          </div>
        ) : null}

        <div className="relative z-0 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">{props.children}</div>

        <div
          data-overlay-notifications="true"
          className="relative z-10 max-h-32 shrink-0 overflow-y-auto overscroll-contain border-t border-border bg-overlay-surface px-4 py-3 empty:hidden"
        />
        {props.footer ? (
          <div className="relative z-10 shrink-0 border-t border-border bg-overlay-surface px-4 py-3">
            {props.footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
