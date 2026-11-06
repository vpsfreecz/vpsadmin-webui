import React, { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Input } from '../../../components/ui/Input';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { Spinner } from '../../../components/ui/Spinner';
import { UserLookupInput } from '../../../components/ui/UserLookupInput';
import type { Vps } from '../../../lib/api/vps';
import type { GateReason } from '../../../lib/gates/types';
import { Field, VpsConfigRiskBadges } from './VpsConfigurationPrimitives';
import {
  START_MENU_TIMEOUT_MAX,
  VPS_MAP_MODES,
  type CgroupVersion,
  type VpsMapMode,
  type VpsConfigDraft,
  type VpsConfigReviewKey,
} from './VpsConfigurationModel';

type LoadState = { isLoading: boolean; isError: boolean; error: unknown };

function ConfigurationGroup({
  title,
  risks,
  children,
}: {
  title: string;
  risks: React.ComponentProps<typeof VpsConfigRiskBadges>['risks'];
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <VpsConfigRiskBadges risks={risks} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function VpsAdditionalConfiguration({
  focusedResources,
  canEditAdminConfig,
  effective,
  pending,
  vps,
  dnsResolversQ,
  dnsOptions,
  userNamespaceMapsQ,
  userNamespaceMapOptions,
  patchDraft,
  fieldMessages,
  onSave,
  onReset,
  saveDisabled,
  disabledReason,
  changeCount,
}: {
  focusedResources: boolean;
  canEditAdminConfig: boolean;
  effective: VpsConfigDraft;
  pending: boolean;
  vps: Vps;
  dnsResolversQ: LoadState;
  dnsOptions: SelectOption[];
  userNamespaceMapsQ: LoadState;
  userNamespaceMapOptions: SelectOption[];
  patchDraft: (patch: Partial<VpsConfigDraft>) => void;
  fieldMessages: (key: VpsConfigReviewKey) => string[];
  onSave: () => void;
  onReset: () => void;
  saveDisabled: boolean;
  disabledReason?: GateReason;
  changeCount: number;
}) {
  const { t } = useI18n();
  const [search] = useSearchParams();
  const { key } = useLocation();
  const focusedDns = search.get('section') === 'dns';
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const dnsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusedDns) return;
    const frame = window.requestAnimationFrame(() => {
      if (detailsRef.current) detailsRef.current.open = true;
      dnsRef.current?.scrollIntoView({ block: 'start' });
      dnsRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusedDns, key]);
  return (
    <details
      ref={detailsRef}
      open={!focusedResources || focusedDns || undefined}
      className="rounded-lg border border-border bg-surface"
      data-testid="vps.config.additional"
    >
      <summary className="cursor-pointer px-4 py-3 font-semibold">{t('vps.resources.additional')}</summary>
      <div className="space-y-4 px-4 pb-4">
        <ConfigurationGroup title={t('vps.config.section.identity')} risks={['safe']}>
          <Field
            label={t('vps.config.field.hostname_mode')}
            help={t('vps.config.help.hostname_mode')}
            errors={fieldMessages('manage_hostname')}
          >
            <Select
              value={effective.hostnameMode}
              onChange={(e) => patchDraft({ hostnameMode: e.target.value as 'managed' | 'manual' })}
              disabled={pending}
              options={[
                { value: 'managed', label: t('vps.config.option.hostname_managed') },
                { value: 'manual', label: t('vps.config.option.hostname_manual') },
              ]}
            />
          </Field>
          <Field
            label={t('vps.config.field.hostname')}
            help={t('vps.config.help.hostname')}
            errors={fieldMessages('hostname')}
          >
            <Input
              value={effective.hostname}
              onChange={(e) => patchDraft({ hostname: e.target.value })}
              disabled={pending || effective.hostnameMode === 'manual'}
              autoComplete="off"
            />
          </Field>
        </ConfigurationGroup>

        <section
          ref={dnsRef}
          tabIndex={-1}
          aria-label={t('vps.config.section.resolvers')}
          data-testid="vps.config.dns"
          className="min-w-0 space-y-2 scroll-mt-20 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <VpsConfigRiskBadges risks={['network']} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t('vps.config.field.dns_resolver')}
              help={t('vps.config.help.dns_resolver_nullable')}
              errors={fieldMessages('dns_resolver')}
            >
              {dnsResolversQ.isLoading ? (
                <Spinner />
              ) : dnsResolversQ.isError ? (
                <Alert variant="danger">{String((dnsResolversQ.error as Error)?.message ?? dnsResolversQ.error)}</Alert>
              ) : (
                <Select
                  testId="vps.config.dns.resolver"
                  value={effective.dnsResolver}
                  onChange={(e) => patchDraft({ dnsResolver: e.target.value })}
                  disabled={pending}
                  options={dnsOptions}
                />
              )}
            </Field>
          </div>
          {focusedDns ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={pending} onClick={onReset} testId="vps.config.dns.reset">
                {t('common.reset')}
              </Button>
              <ActionButton
                disabled={saveDisabled}
                disabledReason={disabledReason}
                loading={pending}
                onClick={onSave}
                testId="vps.config.dns.save"
              >
                {changeCount ? t('vps.config.save_changes', { n: changeCount }) : t('vps.config.save_changes_empty')}
              </ActionButton>
            </div>
          ) : null}
        </section>

        <ConfigurationGroup title={t('vps.config.section.namespace')} risks={['requires_restart']}>
          <Field
            label={t('vps.config.field.user_namespace_map')}
            help={t('vps.config.help.user_namespace_map')}
            errors={fieldMessages('user_namespace_map')}
          >
            {userNamespaceMapsQ.isLoading ? (
              <Spinner />
            ) : userNamespaceMapsQ.isError ? (
              <Alert variant="danger">
                {String((userNamespaceMapsQ.error as Error)?.message ?? userNamespaceMapsQ.error)}
              </Alert>
            ) : (
              <Select
                value={effective.userNamespaceMap}
                onChange={(e) => patchDraft({ userNamespaceMap: e.target.value })}
                disabled={pending || userNamespaceMapOptions.length === 0}
                options={userNamespaceMapOptions}
              />
            )}
          </Field>
          {canEditAdminConfig ? (
            <Field
              label={t('vps.config.field.map_mode')}
              help={t('vps.config.help.map_mode')}
              errors={fieldMessages('map_mode')}
            >
              <Select
                value={effective.mapMode}
                onChange={(e) => patchDraft({ mapMode: e.target.value as VpsMapMode })}
                disabled={pending}
                options={VPS_MAP_MODES.map((mode) => ({
                  value: mode,
                  label: t(`vps.config.option.map_mode.${mode}`),
                }))}
                testId="vps.config.map_mode"
              />
            </Field>
          ) : null}
        </ConfigurationGroup>

        <ConfigurationGroup title={t('vps.config.section.boot')} risks={['boot', 'requires_restart']}>
          {canEditAdminConfig ? (
            <Field
              label={t('vps.config.field.start_menu_timeout')}
              help={t('vps.config.help.start_menu_timeout')}
              errors={fieldMessages('start_menu_timeout')}
            >
              <Input
                value={effective.startMenuTimeout}
                type="number"
                min={0}
                max={START_MENU_TIMEOUT_MAX}
                step={1}
                onChange={(e) => patchDraft({ startMenuTimeout: e.target.value })}
                disabled={pending}
              />
            </Field>
          ) : null}
          <Field label={t('vps.config.field.cgroup_version')} errors={fieldMessages('cgroup_version')}>
            <Select
              value={effective.cgroupVersion}
              onChange={(e) => patchDraft({ cgroupVersion: e.target.value as CgroupVersion })}
              disabled={pending}
              options={[
                { value: 'cgroup_any', label: t('vps.config.option.cgroup_any') },
                { value: 'cgroup_v1', label: 'cgroup v1' },
                { value: 'cgroup_v2', label: 'cgroup v2' },
              ]}
            />
          </Field>
        </ConfigurationGroup>

        <ConfigurationGroup title={t('vps.config.section.admin_access')} risks={['safe']}>
          <Checkbox
            checked={effective.allowAdminModifications}
            onChange={(checked) => patchDraft({ allowAdminModifications: checked })}
            label={t('vps.config.field.allow_admin_modifications')}
            description={t('vps.config.help.allow_admin_modifications')}
            disabled={pending}
          />
        </ConfigurationGroup>

        {canEditAdminConfig ? (
          <ConfigurationGroup title={t('vps.config.section.admin')} risks={['admin_only']}>
            <Field label={t('vps.config.field.owner')} help={t('vps.config.help.owner')} errors={fieldMessages('user')}>
              <UserLookupInput
                value={effective.user}
                onChange={(value) => patchDraft({ user: value })}
                placeholder={t('vps.create.placeholder.user')}
                disabled={pending}
                allowRawId
              />
            </Field>

            <Field
              label={
                <span className="flex flex-wrap items-center gap-2">
                  <span>{t('vps.config.field.autostart_priority')}</span>
                  <Badge
                    variant={vps.autostart_enable === true ? 'ok' : 'neutral'}
                    testId="vps.config.autostart_status"
                  >
                    {t(
                      vps.autostart_enable === true ? 'vps.config.autostart.enabled' : 'vps.config.autostart.disabled'
                    )}
                  </Badge>
                </span>
              }
              help={t('vps.config.help.autostart_priority')}
              errors={fieldMessages('autostart_priority')}
            >
              <Input
                value={effective.autostartPriority}
                type="number"
                min={0}
                step={1}
                onChange={(e) => patchDraft({ autostartPriority: e.target.value })}
                disabled={pending}
              />
            </Field>
            <Field
              label={t('vps.config.field.change_reason')}
              help={t('vps.config.help.change_reason')}
              errors={fieldMessages('change_reason')}
            >
              <Input
                value={effective.changeReason}
                onChange={(e) => patchDraft({ changeReason: e.target.value })}
                disabled={pending}
                autoComplete="off"
              />
            </Field>
          </ConfigurationGroup>
        ) : null}
      </div>
    </details>
  );
}
