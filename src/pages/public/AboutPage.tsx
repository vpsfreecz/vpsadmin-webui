import React from 'react';
import { useI18n } from '../../app/i18n';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { buildCommitUrl, buildInfo, webuiRepository } from '../../lib/buildInfo';

export function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="about.page">
      <div>
        <h1 className="text-2xl font-semibold">{t('about.title')}</h1>
        <p className="mt-2 text-muted">{t('about.description')}</p>
      </div>
      <Card>
        <CardHeader title={t('about.version.title')} />
        <CardBody className="space-y-2 text-sm">
          {buildCommitUrl ? (
            <a
              href={buildCommitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-primary underline"
            >
              {buildInfo.commit}
            </a>
          ) : (
            <p>{t('about.version.unknown')}</p>
          )}
          {buildInfo.dirty && buildCommitUrl ? <p className="text-muted">{t('about.version.modified')}</p> : null}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('about.authors.title')} />
        <CardBody className="text-sm">
          <ul className="space-y-1">
            {[
              { name: 'Jakub Skokan', years: '2012–2026' },
              { name: 'Pavel Šnajdr', years: '2008–2014' },
              { name: 'Michal Janoušek', years: '2026' },
            ].map(({ name, years }) => (
              <li key={name}>
                {name} <span className="text-muted">· {years}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('about.legal.title')} />
        <CardBody className="space-y-3 text-sm">
          <p>{t('about.legal.source')}</p>
          <a
            className="inline-block text-primary underline"
            href={webuiRepository}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('about.legal.repository')}
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
