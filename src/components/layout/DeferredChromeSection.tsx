import React from 'react';

import { useI18n } from '../../app/i18n';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { Modal } from '../ui/Modal';

export function DeferredChromeSection(props: { children: React.ReactNode; testId: string }) {
  return (
    <React.Suspense fallback={<LoadingState kind="inline" testId={props.testId} />}>
      {props.children}
    </React.Suspense>
  );
}

/** Keep a cold overlay's loading state out of the shell's flex layout. */
export function DeferredChromeModal(props: {
  children: React.ReactNode;
  testId: string;
  ariaLabel: string;
  onClose: () => void;
  mobileFullScreen?: boolean;
}) {
  const { t } = useI18n();
  return (
    <React.Suspense fallback={
      <Modal open onClose={props.onClose} ariaLabel={props.ariaLabel}
        mobileFullScreen={props.mobileFullScreen} size="lg" testId={props.testId}>
        <div role="status" aria-busy="true">
          <LoadingState kind="inline" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={props.onClose} testId={`${props.testId}.close`}>
            {t('common.close')}
          </Button>
        </div>
      </Modal>
    }>
      {props.children}
    </React.Suspense>
  );
}
