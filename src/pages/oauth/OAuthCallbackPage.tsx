import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useUiSettings } from '../../app/uiSettings';
import { buildOAuthLoginUrl } from '../../lib/auth/oauthTheme';
import { useI18n } from '../../app/i18n';

import { getRuntimeConfig } from '../../app/config';
import { sanitizeLocalPath, withRouterBasename } from '../../lib/routerPaths';
import { hardReplace } from '../../lib/browserNavigation';
import { completeOAuth2Login, pendingOAuthTheme } from '../../lib/auth/oauth2Client';
import { Button } from '../../components/ui/Button';
import { CardBody, CardHeader } from '../../components/ui/Card';
import { CopyButton } from '../../components/ui/CopyButton';
import { LinkButton } from '../../components/ui/LinkButton';
import { Spinner } from '../../components/ui/Spinner';
import { DocumentTitleOverride } from '../../components/layout/DocumentTitleOverride';
import { OAuthShell } from './OAuthShell';

export function OAuthCallbackPage() {
  const { t } = useI18n();
  const { settings, setTheme } = useUiSettings();
  const [initiatingTheme] = useState(() => pendingOAuthTheme() ?? settings.theme);

  const cfg = useMemo(() => getRuntimeConfig(), []);
  const [, setSearchParams] = useSearchParams();
  const appPath = withRouterBasename('/app', cfg.routerBasename);

  const [error, setError] = useState<string | null>(null);

  const completionRef = useRef<Promise<{ nextPath: string }> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const completion = completionRef.current ??= completeOAuth2Login(cfg, window.location.href);
    completion
      .then(({ nextPath }) => {
        if (cancelled) return;

        // Remove OAuth params from URL to avoid leaking `code` or `state` into history.
        setSearchParams({}, { replace: true });

        // Redirect to the next path.
        hardReplace(sanitizeLocalPath(nextPath, appPath));
      })
      .catch((e) => {
        if (cancelled) return;
        setTheme(initiatingTheme);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [appPath, cfg, initiatingTheme, setSearchParams, setTheme]);

  const loginHref = buildOAuthLoginUrl(withRouterBasename('/oauth/login', cfg.routerBasename), appPath, initiatingTheme);
  const copyText = error ? `OAuth callback failed\n\n${error}` : '';

  return (
    <OAuthShell testId="oauth.callback.page" variant={error ? 'error' : 'progress'}>
      <DocumentTitleOverride title={error ? t('oauth.callback.error.title') : t('oauth.callback.progress.finishing')} />
      {error ? (
        <>
          <CardHeader
            title={t('oauth.callback.error.title')}
            subtitle={t('common.safe_to_share')}
            actions={<CopyButton text={copyText} label={t('common.copy_details')} />}
          />
          <CardBody className="space-y-4">
            <p className="text-sm text-muted">
              {t('oauth.callback.error.body')}
            </p>
            <p className="text-sm text-danger">{error}</p>

            <div className="flex flex-wrap gap-2">
              <Button as="a" href={loginHref} variant="primary">
                {t('oauth.callback.action.sign_in_again')}
              </Button>
              <LinkButton to="/" variant="secondary">
                {t('nav.status')}
              </LinkButton>
            </div>
          </CardBody>
        </>
      ) : (
        <CardBody>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Spinner />
            <span>{t('oauth.callback.progress.finishing')}</span>
          </div>
        </CardBody>
      )}
    </OAuthShell>
  );
}
