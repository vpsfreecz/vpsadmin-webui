import React from 'react';
import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { clsx } from '../../../components/ui/clsx';
import { ConsoleViewport } from './ConsoleViewport';

export function VpsConsoleFrame({
  vpsId,
  consoleUrl,
  focused,
  frameNonce,
  iframeLoaded,
  iframeProblem,
  reconnect,
  onLoad,
}: {
  vpsId: number;
  consoleUrl: string;
  focused: boolean;
  frameNonce: number;
  iframeLoaded: boolean;
  iframeProblem: boolean;
  reconnect: () => void;
  onLoad: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-md border bg-code shadow-card transition-shadow',
        focused ? 'border-accent shadow-panel' : 'border-border'
      )}
      data-testid="vps.console.frame"
    >
      <ConsoleViewport nativeSize={focused}>
        {!iframeLoaded && !iframeProblem ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black text-sm text-white/75"
            data-testid="vps.console.iframe_loading"
          >
            <div className="flex items-center gap-2">
              <Spinner /> {t('vps.console.loading_frame')}
            </div>
          </div>
        ) : null}
        {iframeProblem ? (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black p-6 text-center text-sm text-white/80"
            data-testid="vps.console.embed_fallback"
          >
            <div className="max-w-md space-y-3">
              <div className="text-base font-semibold text-white">{t('vps.console.embed_fallback.title')}</div>
              <div>{t('vps.console.embed_fallback.body')}</div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={reconnect} testId="vps.console.fallback.reconnect">
                  {t('vps.console.reconnect.label')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <iframe
          key={`${consoleUrl}-${frameNonce}`}
          title={t('vps.console.iframe_title', { id: vpsId })}
          src={consoleUrl!}
          className="block h-full w-full border-0 bg-black"
          allow="clipboard-read; clipboard-write"
          data-testid="vps.console.iframe"
          onLoad={onLoad}
        />
      </ConsoleViewport>
    </div>
  );
}
