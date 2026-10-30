import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalMutationLocks } from '../../../components/layout/useLocalMutationLocks';
import { installSerialWebLocks } from '../../../components/layout/webLocksTestMock';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { MissingActionStateError } from '../../../lib/api/apiErrors';
import type { Vps } from '../../../lib/api/vps';
import { isLocalLockPersistenceError } from '../../../lib/localLocks';
import { objectRef } from '../../../lib/objectRef';
import { apiWire } from '../../../test/haveapiXhr';
import { VpsIncidentSettingsForm } from './VpsIncidentSettingsForm';

const state = vi.hoisted(() => ({ refetch: vi.fn(), settled: vi.fn(), track: vi.fn() }));
let locks: ReturnType<typeof useLocalMutationLocks>;
const ref = objectRef('Vps', 12);
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: keyof typeof enVps_incidentEscalation) => enVps_incidentEscalation[key] ?? key }) }));
vi.mock('../../../components/layout/ChromeContext', () => ({ useChrome: () => ({
  ...locks, trackActionState: state.track,
  settleLocalLock: (...args: Parameters<typeof locks.settleLocalLock>) => {
    locks.settleLocalLock(...args);
    state.settled(...args);
  },
}) }));
vi.mock('./VpsContext', () => ({ useVps: () => ({
  canMutateVps: true, busyTransaction: false, busyLocalLock: locks.isLocallyLocked(ref), refetch: state.refetch,
}) }));
vi.mock('./vpsPreflight', () => ({ preflightVpsNotBusy: vi.fn().mockResolvedValue(undefined) }));

const vps: Vps = {
  id: 12, hostname: 'example.test', object_state: 'active', incident_policy: 'oomd',
  incident_warning_limit_override: 5, incident_stop_limit_override: 10,
  incident_warning_limit: 5, incident_stop_limit: 10, incident_enforcement_enabled: true,
};
const saved: Vps = { ...vps, incident_warning_limit_override: null, incident_stop_limit_override: null };
let pendingId: unknown;
function readback(fresh: Vps, status = 200) {
  apiWire.respond = (_url, init) => {
    if (init?.method === 'PUT') return new Response(JSON.stringify({ status: true, response: { vps: { id: 12 } } }));
    const key = Object.keys(localStorage).find(value => value.includes('.uncertain.'));
    pendingId = JSON.parse(localStorage.getItem(key ?? '') ?? '{}').uncertaintyId;
    return new Response(JSON.stringify(status === 200
      ? { status: true, response: { vps: fresh } }
      : { status: false, message: 'Forbidden', response: null }), { status });
  };
}
function Harness() {
  locks = useLocalMutationLocks({ userId: 42, persistenceErrorMessage: 'guard persistence failed', outcomeUncertainMessage: 'outcome uncertain' });
  return <VpsIncidentSettingsForm vps={vps} />;
}
async function submitDefaults() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><Harness /></QueryClientProvider>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Use default limits' }));
  await user.click(screen.getByRole('button', { name: 'Save incident settings' }));
  await user.click(screen.getByTestId('vps.incident.confirm.confirm'));
  await waitFor(() => expect(state.settled).toHaveBeenCalledTimes(1));
  expect(apiWire.requests.map(request => [request.method, new URL(request.url).pathname])).toEqual([
    ['PUT', '/v7.0/vpses/12'], ['GET', '/v7.0/vpses/12'],
  ]);
  expect(new URL(apiWire.requests[1]!.url).searchParams.get('vps[incident_policy]')).toBe('oomd');
  expect(pendingId).toEqual(expect.any(String));
  return user;
}
beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear(); window.sessionStorage.clear();
  installSerialWebLocks(); pendingId = undefined;
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: '7.0' }, sessionToken: 'fixture-token',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
});
afterEach(() => {
  cleanup(); window.vpsAdmin = undefined;
  vi.restoreAllMocks(); Reflect.deleteProperty(navigator, 'locks');
});

describe('incident settings verification with the real durable mutation guard', () => {
  it.each<{ name: string; fresh: Vps; status?: number }>([
    { name: 'mismatched settings', fresh: vps },
    { name: 'absent summary', fresh: { id: 12 } },
    { name: 'authoritative read HTTP403', fresh: saved, status: 403 },
    { name: 'matching settings from the wrong VPS', fresh: { ...saved, id: 13 } },
  ])('retains the same guard and draft after $name', async ({ fresh, status }) => {
    readback(fresh, status);
    const user = await submitDefaults();
    expect(locks.localLocks[0]).toMatchObject({ key: 'Vps:12', uncertain: true, uncertaintyId: pendingId });
    const error: unknown = state.settled.mock.calls[0]![1];
    expect(error).toBeInstanceOf(MissingActionStateError);
    expect(screen.getAllByText(enVps_incidentEscalation['incidentEscalation.verifyError'])).toHaveLength(2);
    expect(screen.getByLabelText('Warning limit override (7 days)')).toHaveValue('');
    expect(screen.getByLabelText('Stop limit override (30 days)')).toHaveValue('');
    expect(state.refetch).not.toHaveBeenCalled();
    const confirm = screen.getByTestId('vps.incident.confirm.confirm');
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    act(() => locks.releaseLocalLock(ref));
    await act(async () => {
      await expect(locks.acquireLocalLock(ref, { durable: true })).rejects.toSatisfy(isLocalLockPersistenceError);
    });
    expect(apiWire.requests).toHaveLength(2);
    expect(locks.isLocallyLocked(ref)).toBe(true);
    expect(locks.localLocks[0]?.uncertaintyId).toBe(pendingId);
    const key = Object.keys(localStorage).find(value => value.includes('.uncertain.'));
    expect(JSON.parse(localStorage.getItem(key ?? '') ?? '{}')).toMatchObject({ uncertain: true, uncertaintyId: pendingId });
  });

  it('releases the guard only after the exact VPS and selected settings are verified', async () => {
    readback(saved);
    await submitDefaults();
    expect(state.settled.mock.calls[0]![1]).toBeNull();
    expect(locks.isLocallyLocked(ref)).toBe(false);
    expect(Object.keys(localStorage).filter(value => value.includes('.uncertain.'))).toEqual([]);
    expect(state.refetch).toHaveBeenCalledTimes(1);
    expect(state.track).not.toHaveBeenCalled();
    expect(screen.queryByTestId('vps.incident.confirm.confirm')).not.toBeInTheDocument();
  });
});
