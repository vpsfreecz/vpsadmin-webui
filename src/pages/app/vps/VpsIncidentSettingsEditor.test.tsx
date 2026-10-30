import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLocalMutationLocks } from '../../../components/layout/useLocalMutationLocks';
import { installSerialWebLocks } from '../../../components/layout/webLocksTestMock';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { MissingActionStateError } from '../../../lib/api/apiErrors';
import { objectRef } from '../../../lib/objectRef';
import { VpsIncidentSettingsEditor, type IncidentSettingsChange } from './VpsIncidentSettingsEditor';
import { saveIncidentSettings } from './VpsIncidentPoliciesPage';
import { apiWire } from '../../../test/haveapiXhr';

const state = vi.hoisted(() => ({ save: vi.fn(), refetch: vi.fn(), settled: vi.fn() }));
let locks: ReturnType<typeof useLocalMutationLocks>;
const ref = objectRef('Vps', 12);
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({
    tc: (key: string, count: number, vars?: Record<string, unknown>) => {
      const dict: Record<string, string> = enVps_incidentEscalation;
      return Object.entries({ count, ...vars }).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        dict[`${key}.${new Intl.PluralRules('en').select(count)}`] ?? key
      );
    },
    t: (key: string, vars?: Record<string, unknown>) => {
      const dict: Record<string, string> = { ...enVps_incidentEscalation, 'common.save': 'Save' };
      return Object.entries(vars ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        dict[key] ?? key
      );
    },
  }),
}));
vi.mock('../../../components/layout/ChromeContext', () => ({
  useChrome: () => ({
    ...locks,
    settleLocalLock: (...args: Parameters<typeof locks.settleLocalLock>) => {
      locks.settleLocalLock(...args);
      state.settled(...args);
    },
  }),
}));
vi.mock('./VpsContext', () => ({
  useVps: () => ({
    canMutateVps: true,
    busyTransaction: false,
    busyLocalLock: locks.isLocallyLocked(ref),
    refetch: state.refetch,
  }),
}));
vi.mock('./vpsPreflight', () => ({ preflightVpsNotBusy: vi.fn().mockResolvedValue(undefined) }));

function Harness({
  settings,
  effectiveWarning,
  effectiveShutdown,
}: {
  settings: IncidentSettingsChange;
  effectiveWarning?: number;
  effectiveShutdown?: number;
}) {
  locks = useLocalMutationLocks({
    userId: 42,
    persistenceErrorMessage: 'Persistence failed',
    outcomeUncertainMessage: 'Outcome uncertain',
  });
  return (
    <VpsIncidentSettingsEditor
      vps={{ id: 12, hostname: 'target.example.test', object_state: 'active' }}
      settings={settings}
      saveSettings={state.save}
      effectiveWarning={effectiveWarning}
      effectiveShutdown={effectiveShutdown}
      warningPeriod={7}
      shutdownPeriod={30}
    />
  );
}
function show(
  settings: IncidentSettingsChange,
  effective: { effectiveWarning?: number; effectiveShutdown?: number } = {}
) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const tree = (value: IncidentSettingsChange, facts = effective) => (
    <QueryClientProvider client={client}>
      <Harness settings={value} {...facts} />
    </QueryClientProvider>
  );
  const rendered = render(tree(settings));
  return {
    ...rendered,
    readback: (value: IncidentSettingsChange, facts = effective) => rendered.rerender(tree(value, facts)),
  };
}
const policy: IncidentSettingsChange = {
  kind: 'limits',
  policyKey: 'arbitrary_key',
  policyLabel: 'API policy',
  warning: 5,
  shutdown: 10,
};
beforeEach(() => {
  vi.clearAllMocks();
  state.save.mockResolvedValue(undefined);
  localStorage.clear();
  sessionStorage.clear();
  installSerialWebLocks();
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: '7.0' },
    sessionToken: 'synthetic',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'locks');
  window.vpsAdmin = undefined;
});

it('confirms an isolated per-policy draft; inheritance never changes shared permission', async () => {
  show(policy);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Use inherited limits' }));
  expect(state.save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Save limits for API policy on VPS #12 (target.example.test)?')).toBeVisible();
  expect(state.save).not.toHaveBeenCalled();
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(state.save).toHaveBeenCalledWith(12, { ...policy, warning: null, shutdown: null });
  expect(locks.isLocallyLocked(ref)).toBe(false);
});

it('saves shared permission separately with no selected-policy prerequisite or limit reset', async () => {
  show({ kind: 'permission', allowed: true });
  const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox', { name: 'Allow automatic shutdown' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(state.save).toHaveBeenCalledWith(12, { kind: 'permission', allowed: false });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('keeps the real durable generation and draft when the accepted write cannot be verified', async () => {
  const uncertain = new MissingActionStateError('settings readback', undefined);
  state.save.mockRejectedValue(uncertain);
  show(policy);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Use inherited limits' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(locks.localLocks[0]).toMatchObject({ key: 'Vps:12', uncertain: true });
  const generation = locks.localLocks[0]?.uncertaintyId;
  expect(generation).toEqual(expect.any(String));
  expect(screen.getByLabelText('Warning limit')).toHaveValue('');
  expect(screen.getByLabelText('Shutdown limit')).toHaveValue('');
  const confirm = screen.getByTestId('vps.incidents.confirm.confirm');
  expect(confirm).toBeDisabled();
  await user.click(confirm);
  expect(state.save).toHaveBeenCalledTimes(1);
  expect(locks.localLocks[0]?.uncertaintyId).toBe(generation);
  expect(state.refetch).not.toHaveBeenCalled();
});

it.each(['mismatched policy', 'missing policy', 'wrong VPS', 'read HTTP403'])(
  'real SDK verification retains the durable lock after %s',
  async (failure) => {
    state.save.mockImplementation(saveIncidentSettings);
    const limits = failure === 'mismatched policy' || failure === 'missing policy';
    apiWire.respond = async (_url, init) => {
      if (init?.method === 'PUT')
        return {
          json: async () => ({
            status: true,
            response: limits
              ? {
                  incident_policy:
                    failure === 'missing policy'
                      ? {}
                      : {
                          key: 'wrong',
                          label: 'Wrong policy',
                          warning_period_days: 7,
                          stop_period_days: 30,
                          count_7d: 0,
                          count_30d: 0,
                          configuration_valid: true,
                          warning_limit: 5,
                          stop_limit: 10,
                          status: 'clear',
                          warning_limit_override: null,
                          stop_limit_override: null,
                        },
                }
              : { vps: { ok: true } },
          }),
        };
      return failure === 'read HTTP403'
        ? { status: 403, json: async () => ({ status: false, message: 'Forbidden' }) }
        : { json: async () => ({ status: true, response: { vps: { id: 13, incident_enforcement_enabled: false } } }) };
    };
    show(limits ? policy : { kind: 'permission', allowed: true });
    const user = userEvent.setup();
    if (limits) await user.click(screen.getByRole('button', { name: 'Use inherited limits' }));
    else await user.click(screen.getByRole('checkbox', { name: 'Allow automatic shutdown' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
    await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
    expect(locks.localLocks[0]).toMatchObject({ key: 'Vps:12', uncertain: true });
    const count = apiWire.requests.length;
    const confirm = screen.getByTestId('vps.incidents.confirm.confirm');
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(apiWire.requests).toHaveLength(count);
    expect(apiWire.requests[0]?.method).toBe('PUT');
    expect(new URL(apiWire.requests[0]!.url).pathname).toBe(
      limits ? '/v7.0/vpses/12/incident_policies/arbitrary_key' : '/v7.0/vpses/12'
    );
    expect(state.refetch).not.toHaveBeenCalled();
  }
);

it('releases the same real guard after an exact successful shared VPS readback', async () => {
  state.save.mockImplementation(saveIncidentSettings);
  apiWire.respond = async (_url, init) => ({
    json: async () => ({
      status: true,
      response: { vps: init?.method === 'PUT' ? { ok: true } : { id: 12, incident_enforcement_enabled: false } },
    }),
  });
  show({ kind: 'permission', allowed: true });
  const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox', { name: 'Allow automatic shutdown' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(locks.isLocallyLocked(ref)).toBe(false);
  expect(apiWire.requests.map((request) => request.method)).toEqual(['PUT', 'GET']);
  expect(state.refetch).toHaveBeenCalledTimes(1);
});

it('prefills inherited effective limits without converting the untouched sibling into an override', async () => {
  const inherited = { ...policy, warning: null, shutdown: null };
  show(inherited, { effectiveWarning: 3, effectiveShutdown: 10 });
  expect(screen.getByLabelText('Warning limit')).toHaveValue('3');
  expect(screen.getByLabelText('Shutdown limit')).toHaveValue('10');
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(screen.getByText('3 reports in 7 days')).toBeVisible();
  expect(screen.getByText('10 reports in 30 days')).toBeVisible();
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Warning limit'));
  await user.type(screen.getByLabelText('Warning limit'), '4');
  expect(screen.getByRole('combobox', { name: /^Warning limit/ })).toHaveValue('custom');
  expect(screen.getByRole('combobox', { name: /^Shutdown limit/ })).toHaveValue('inherited');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(state.save).toHaveBeenCalledWith(12, { ...inherited, warning: 4, shutdown: null });
});
it('preserves a deliberately custom value equal to the inherited limit', async () => {
  const inherited = { ...policy, warning: null, shutdown: null };
  show(inherited, { effectiveWarning: 3, effectiveShutdown: 10 });
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole('combobox', { name: /^Warning limit/ }), 'custom');
  expect(screen.getByLabelText('Warning limit')).toHaveValue('3');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(state.save).toHaveBeenCalledWith(12, { ...inherited, warning: 3, shutdown: null });
});
it('keeps custom-to-inherit pending until authoritative props supply the effective limit', async () => {
  const view = show(policy, { effectiveWarning: 5, effectiveShutdown: 10 });
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole('combobox', { name: /^Warning limit/ }), 'inherited');
  expect(screen.getByLabelText('Warning limit')).toHaveValue('');
  expect(screen.getByText('Inherited after saving')).toBeVisible();
  expect(screen.queryByText('5 reports in 7 days')).not.toBeInTheDocument();
  expect(state.save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(state.save).toHaveBeenCalledWith(12, { ...policy, warning: null });
  view.readback({ ...policy, warning: null }, { effectiveWarning: 3, effectiveShutdown: 10 });
  expect(screen.getByLabelText('Warning limit')).toHaveValue('3');
  expect(screen.getByRole('combobox', { name: /^Warning limit/ })).toHaveValue('inherited');
  expect(screen.queryByText('Inherited after saving')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
});
it('retains an explicit custom draft and ordinary error feedback after a rejected write', async () => {
  state.save.mockRejectedValue(new Error('Rejected settings'));
  show({ ...policy, warning: null, shutdown: null }, { effectiveWarning: 3, effectiveShutdown: 10 });
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Warning limit'));
  await user.type(screen.getByLabelText('Warning limit'), '4');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await user.click(screen.getByTestId('vps.incidents.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Warning limit')).toHaveValue('4');
  expect(screen.getByRole('combobox', { name: /^Warning limit/ })).toHaveValue('custom');
  expect(screen.getAllByText('Rejected settings').length).toBeGreaterThan(0);
  expect(screen.getByTestId('vps.incidents.limits')).not.toHaveClass('border-t', 'pt-3');
});
it('rejects custom zero and leaves unknown inherited limits unknown', async () => {
  show({ ...policy, warning: null, shutdown: null });
  expect(screen.getByLabelText('Warning limit')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Warning limit'), '0');
  expect(screen.getByRole('combobox', { name: /^Warning limit/ })).toHaveValue('custom');
  expect(screen.getByText(enVps_incidentEscalation['incidentEscalation.invalidLimits'])).toBeVisible();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(state.save).not.toHaveBeenCalled();
});
