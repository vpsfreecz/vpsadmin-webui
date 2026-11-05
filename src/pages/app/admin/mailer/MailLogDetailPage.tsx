import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAppMode } from '../../../../app/appMode';
import { useI18n } from '../../../../app/i18n';

import { DetailShell } from '../../../../components/layout/DetailShell';

import { fetchMailLog } from '../../../../lib/api/mailer';
import { formatDateTime } from '../../../../lib/format';
import { resourceId, refLabel } from '../../../../lib/resources';

import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { ObjectHeader } from '../../../../components/ui/ObjectHeader';
import { SandboxedHtml } from '../../../../components/ui/SandboxedHtml';
import { MailerTabs } from './MailerTabs';

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s;
}

export function MailLogDetailPage() {
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const { mailLogId } = useParams();
  const idNum = mailLogId ? Number(mailLogId) : NaN;
  const valid = Number.isFinite(idNum) && idNum > 0;

  const [tab, setTab] = useState<'plain' | 'html'>('plain');
  const [showRawHtml, setShowRawHtml] = useState(false);

  const q = useQuery({
    queryKey: ['mailer', 'mail_logs', 'show', idNum],
    enabled: valid,
    queryFn: () => fetchMailLog(idNum),
  });

  const mail = q.data?.data;

  const subject = safeStr(mail?.subject) || t('mailer.log.row.no_subject');

  const userId = resourceId(mail?.user);
  const tplId = resourceId(mail?.mail_template);

  const title = subject;

  const textPlain = safeStr(mail?.text_plain);
  const textHtml = safeStr(mail?.text_html);

  const to = safeStr(mail?.to);
  const cc = safeStr(mail?.cc);
  const bcc = safeStr(mail?.bcc);

  const from = safeStr(mail?.from);
  const replyTo = safeStr(mail?.reply_to);
  const returnPath = safeStr(mail?.return_path);

  const messageId = safeStr(mail?.message_id);
  const inReplyTo = safeStr(mail?.in_reply_to);
  const references = safeStr(mail?.references);

  const createdAt = safeStr(mail?.created_at);

  const userLabel = refLabel(mail?.user) ?? (userId ? `#${userId}` : t('common.na'));
  const tplLabel = refLabel(mail?.mail_template) ?? (tplId ? `#${tplId}` : t('common.na'));

  const recipientAny = Boolean(to || cc || bcc);

  const hasBodyPlain = Boolean(textPlain.trim());
  const hasBodyHtml = Boolean(textHtml.trim());

  const bodyTab = useMemo(() => {
    if (tab === 'html') {
      if (!hasBodyHtml) {
        return <div className="text-sm text-muted">{t('mailer.log.detail.body.empty_html')}</div>;
      }

      return showRawHtml ? (
        <pre className="max-h-scroll-lg overflow-auto rounded-md border border-border bg-surface-2 p-3 text-xs text-fg">
          {textHtml}
        </pre>
      ) : (
        <SandboxedHtml html={textHtml} testId="admin.mailer.log.detail.body.html" />
      );
    }

    if (!hasBodyPlain) {
      return <div className="text-sm text-muted">{t('mailer.log.detail.body.empty_plain')}</div>;
    }

    return (
      <pre className="max-h-scroll-lg overflow-auto rounded-md border border-border bg-surface-2 p-3 text-xs text-fg whitespace-pre-wrap">
        {textPlain}
      </pre>
    );
  }, [hasBodyHtml, hasBodyPlain, showRawHtml, t, tab, textHtml, textPlain]);

  return (
    <DetailShell testId="admin.mailer.log.detail" variant="wide">
      <MailerTabs />

      <ObjectHeader
        boxed
        testId="admin.mailer.log.detail.header"
        title={title}
        kicker={
          <Link className="text-accent hover:underline" to={`${basePath}/mailer/log`}>
            {t('mailer.log.list.title')}
          </Link>
        }
        meta={
          valid ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>#{idNum}</span>
              {mail && !q.isLoading && !q.isError ? (
                <>
                  <span>
                    {t('common.user')}:{' '}
                    {userId ? (
                      <Link className="text-accent hover:underline" to={`${basePath}/users/${userId}`}>
                        {userLabel}
                      </Link>
                    ) : (
                      <span className="text-muted">{userLabel}</span>
                    )}
                  </span>
                  <span>
                    {t('mailer.log.row.template')}: {tplLabel}
                  </span>
                </>
              ) : null}
            </div>
          ) : undefined
        }
        titleAfter={<Badge variant="neutral">{formatDateTime(createdAt)}</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()} testId="admin.mailer.log.detail.print">
              {t('mailer.log.detail.print')}
            </Button>
          </div>
        }
      />

      {!valid ? (
        <ErrorState
          testId="admin.mailer.log.detail.invalid"
          kindOverride="not_found"
          title={t('mailer.log.detail.invalid_title')}
          body={t('mailer.log.detail.invalid_body')}
          backTo={`${basePath}/mailer/log`}
          showStatusLink={false}
          showDetails={false}
          detailsExtra={{ page: 'admin.mailer.log.detail', mailLogId }}
        />
      ) : q.isLoading ? (
        <LoadingState testId="admin.mailer.log.detail.loading" />
      ) : q.isError ? (
        <ErrorState
          testId="admin.mailer.log.detail.error"
          title={t('mailer.log.detail.load_error')}
          error={q.error}
          onRetry={() => void q.refetch()}
          backTo={`${basePath}/mailer/log`}
          detailsExtra={{ page: 'admin.mailer.log.detail', mailLogId: idNum }}
        />
      ) : mail ? (
        <>
          <Card testId="admin.mailer.log.detail.recipients">
            <CardHeader title={t('mailer.log.detail.section.recipients')} />
            <CardBody>
              <div className="mb-4">
                <div className="text-xs text-muted">{t('mailer.log.detail.from')}</div>
                <div className="mt-1 text-sm">{from || t('common.na')}</div>
              </div>
              {!recipientAny ? (
                <div className="text-sm text-muted">{t('mailer.log.detail.recipients.empty')}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {to ? (
                    <div>
                      <div className="text-xs text-muted">{t('mailer.log.row.to')}</div>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <pre className="max-h-40 flex-1 overflow-auto rounded-md border border-border bg-surface-2 p-2 text-xs text-fg whitespace-pre-wrap">
                          {to}
                        </pre>
                        <CopyButton text={to} testId="admin.mailer.log.detail.copy.to" />
                      </div>
                    </div>
                  ) : null}

                  {cc ? (
                    <div>
                      <div className="text-xs text-muted">{t('mailer.log.detail.cc')}</div>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <pre className="max-h-40 flex-1 overflow-auto rounded-md border border-border bg-surface-2 p-2 text-xs text-fg whitespace-pre-wrap">
                          {cc}
                        </pre>
                        <CopyButton text={cc} testId="admin.mailer.log.detail.copy.cc" />
                      </div>
                    </div>
                  ) : null}

                  {bcc ? (
                    <div>
                      <div className="text-xs text-muted">{t('mailer.log.detail.bcc')}</div>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <pre className="max-h-40 flex-1 overflow-auto rounded-md border border-border bg-surface-2 p-2 text-xs text-fg whitespace-pre-wrap">
                          {bcc}
                        </pre>
                        <CopyButton text={bcc} testId="admin.mailer.log.detail.copy.bcc" />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardBody>
          </Card>

          <Card testId="admin.mailer.log.detail.body">
            <CardHeader
              title={t('mailer.log.detail.section.body')}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={tab === 'plain' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTab('plain')}
                    testId="admin.mailer.log.detail.tab.plain"
                  >
                    {t('mailer.log.detail.tab.plain')}
                  </Button>
                  <Button
                    variant={tab === 'html' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTab('html')}
                    testId="admin.mailer.log.detail.tab.html"
                  >
                    {t('mailer.log.detail.tab.html')}
                  </Button>
                </div>
              }
            />
            <CardBody>
              {tab === 'html' && hasBodyHtml ? (
                <Checkbox
                  checked={showRawHtml}
                  onChange={setShowRawHtml}
                  label={t('mailer.log.detail.body.raw_toggle')}
                  description={t('mailer.log.detail.body.raw_toggle_desc')}
                  testId="admin.mailer.log.detail.body.raw_toggle"
                  className="mb-3"
                />
              ) : null}

              {bodyTab}
            </CardBody>
          </Card>

          <Card testId="admin.mailer.log.detail.headers">
            <details>
              <summary className="cursor-pointer px-4 py-3 font-semibold">
                {t('mailer.log.detail.section.headers')}
              </summary>
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-2">
                  {messageId ? (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted">{t('mailer.log.row.message_id')}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <div className="min-w-0 truncate text-sm" title={messageId}>
                          {messageId}
                        </div>
                        <CopyButton text={messageId} testId="admin.mailer.log.detail.copy.message_id" />
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-xs text-muted">{t('mailer.log.detail.reply_to')}</div>
                    <div className="mt-1 text-sm">{replyTo || t('common.na')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">{t('mailer.log.detail.return_path')}</div>
                    <div className="mt-1 text-sm">{returnPath || t('common.na')}</div>
                  </div>
                  {inReplyTo ? (
                    <div>
                      <div className="text-xs text-muted">{t('mailer.log.detail.in_reply_to')}</div>
                      <div className="mt-1 text-sm">{inReplyTo}</div>
                    </div>
                  ) : null}
                  {references ? (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted">{t('mailer.log.detail.references')}</div>
                      <div className="mt-1 text-sm break-words">{references}</div>
                    </div>
                  ) : null}
                </div>
              </CardBody>
            </details>
          </Card>
        </>
      ) : (
        <ErrorState
          testId="admin.mailer.log.detail.not_found"
          kindOverride="not_found"
          title={t('mailer.log.detail.not_found_title')}
          body={t('mailer.log.detail.not_found_body')}
          backTo={`${basePath}/mailer/log`}
          showStatusLink={false}
          showDetails={false}
          detailsExtra={{ page: 'admin.mailer.log.detail', mailLogId: idNum }}
        />
      )}
    </DetailShell>
  );
}
