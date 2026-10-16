import React from 'react';
import { useI18n } from '../../app/i18n';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { buildCommitUrl, buildInfo, webuiRepository } from '../../lib/buildInfo';

export function AboutPage() {
  const { t } = useI18n();
  const sourceRef = buildCommitUrl ? buildInfo.commit : 'main';
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
        <CardBody className="space-y-4 text-sm">
          <dl className="space-y-3">
            {(['jakub', 'pavel', 'michal'] as const).map((person) => (
              <div key={person} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="font-semibold">
                  {{ jakub: 'Jakub Skokan', pavel: 'Pavel Šnajdr', michal: 'Michal Janoušek' }[person]}
                </dt>
                <dd className="text-muted">{t(`about.authors.${person}`)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted">{t('about.authors.thanks')}</p>
          <p className="text-muted">{t('about.authors.ai')}</p>
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
          <p>{t('about.legal.license')}</p>
          <a
            className="inline-block text-primary underline"
            href={`${webuiRepository}/blob/${sourceRef}/package.json`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('about.legal.dependencies')}
          </a>
          <p className="text-muted">{t('about.legal.third_party')}</p>
        </CardBody>
      </Card>
    </div>
  );
}
