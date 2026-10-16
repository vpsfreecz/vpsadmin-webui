import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../app/i18n';
import { buildCommitUrl, buildInfo } from '../../lib/buildInfo';

export function BuildFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const version = buildCommitUrl ? `${buildInfo.shortCommit}${buildInfo.dirty ? '*' : ''}` : t('about.version.unknown');
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted"
      data-testid="build.footer"
    >
      <Link
        to="/about"
        onClick={onNavigate}
        className="rounded py-2 text-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {t('about.title')}
      </Link>
      {buildCommitUrl ? (
        <a
          href={buildCommitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded py-2 font-mono text-muted hover:text-fg"
          title={`${buildInfo.commit}${buildInfo.dirty ? ` — ${t('about.version.modified')}` : ''}`}
          aria-label={t('about.version.link', { version })}
        >
          {version}
        </a>
      ) : (
        <span>{version}</span>
      )}
    </div>
  );
}
