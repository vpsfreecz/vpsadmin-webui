import { Link } from 'react-router-dom';

import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';

export type LifecycleActionChoice<Kind extends string> = {
  kind: Kind;
  title: string;
  description: string;
  danger?: boolean;
  adminOnly?: boolean;
};

export function VpsLifecycleActionIndex<Kind extends string>(props: {
  choices: Array<LifecycleActionChoice<Kind>>;
  canAdministerVps: boolean;
  pathForChoice: (kind: Kind) => string;
}) {
  const { t } = useI18n();
  const dailyChoices = props.choices.filter((choice) => !choice.adminOnly);
  const adminChoices = props.canAdministerVps ? props.choices.filter((choice) => choice.adminOnly) : [];
  const renderLink = (choice: LifecycleActionChoice<Kind>) => (
    <Link
      key={choice.kind}
      to={props.pathForChoice(choice.kind)}
      className={[
        'rounded-lg border bg-surface p-4 text-left shadow-card transition hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus',
        choice.danger ? 'border-danger-border' : 'border-border',
      ].join(' ')}
      data-testid={`vps.lifecycle.action_link.${choice.kind}`}
    >
      <span className={choice.danger ? 'block text-sm font-semibold text-danger' : 'block text-sm font-semibold text-fg'}>
        {choice.title}
      </span>
      <span className="mt-1 block text-xs text-muted">{choice.description}</span>
    </Link>
  );

  return (
    <div className="space-y-4" data-testid="vps.lifecycle.page">
      <Card testId="vps.lifecycle.summary">
        <CardHeader title={t('vps.lifecycle.title')} subtitle={props.canAdministerVps ? t('vps.lifecycle.subtitle_admin') : t('vps.lifecycle.subtitle_user')} />
        <CardBody className="space-y-4">
          <Alert variant="neutral">
            {props.canAdministerVps ? t('vps.lifecycle.action_index.summary_admin') : t('vps.lifecycle.action_index.summary_user')}
          </Alert>
          <div className="space-y-4" data-testid="vps.lifecycle.action_index">
            <section className="space-y-2" data-testid="vps.lifecycle.daily_actions">
              <div>
                <h2 className="text-sm font-semibold text-fg">{t('vps.lifecycle.action_index.daily_title')}</h2>
                <p className="text-xs text-muted">{t('vps.lifecycle.action_index.daily_subtitle')}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dailyChoices.map(renderLink)}
              </div>
            </section>
            {adminChoices.length ? (
              <section className="space-y-2 rounded-lg border border-border bg-surface p-3" data-testid="vps.lifecycle.admin_actions">
                <div>
                  <h2 className="text-sm font-semibold text-fg">{t('vps.lifecycle.action_index.admin_title')}</h2>
                  <p className="text-xs text-muted">{t('vps.lifecycle.action_index.admin_subtitle')}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {adminChoices.map(renderLink)}
                </div>
              </section>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
