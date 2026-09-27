import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VpsHeaderActionDialogs, type VpsHeaderConfirm } from './VpsHeaderActionDialogs';
import { VpsListActionConfirmDialog, type VpsListActionConfirm } from './VpsListActionConfirmDialog';
import { VpsPowerActionCard } from './VpsPowerActionCard';
import { VpsLifecycleActionIndex } from './VpsLifecycleActionIndex';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'cs' }));

vi.mock('../../../app/i18n', async () => {
  const [{ en }, { cs }] = await Promise.all([import('../../../i18n/en'), import('../../../i18n/cs')]);
  return {
    useI18n: () => ({ t: (key: string) => (state.locale === 'en' ? en : cs)[key as keyof typeof en] ?? key }),
  };
});

describe('lifecycle action index extraction', () => {
  it('keeps admin-only links out of the member index', () => {
    state.locale = 'en';
    const choices = [
      { kind: 'stop', title: 'Shutdown', description: 'Graceful shutdown' },
      { kind: 'migrate', title: 'Migrate', description: 'Move VPS', adminOnly: true },
    ];
    const pathForChoice = (kind: string) => `/me/vps/101/lifecycle/${kind}`;
    const { rerender } = render(<MemoryRouter><VpsLifecycleActionIndex choices={choices} canAdministerVps={false} pathForChoice={pathForChoice} /></MemoryRouter>);
    expect(screen.getByTestId('vps.lifecycle.action_link.stop')).toHaveAttribute('href', '/me/vps/101/lifecycle/stop');
    expect(screen.queryByTestId('vps.lifecycle.action_link.migrate')).not.toBeInTheDocument();
    rerender(<MemoryRouter><VpsLifecycleActionIndex choices={choices} canAdministerVps pathForChoice={pathForChoice} /></MemoryRouter>);
    expect(screen.getByTestId('vps.lifecycle.action_link.migrate')).toHaveAttribute('href', '/me/vps/101/lifecycle/migrate');
  });
});

function HeaderHarness(props: { onStop: (force: boolean) => void }) {
  const [confirm, setConfirm] = useState<VpsHeaderConfirm>({ kind: 'stop', force: false });
  return <VpsHeaderActionDialogs
    vpsId={101} hostname="example.test" confirm={confirm} onConfirmChange={setConfirm}
    stopAllowed restartAllowed passwordAllowed stopPending={false} restartPending={false} passwordPending={false}
    stopError={null} restartError={null} passwordError={null}
    onStop={props.onStop} onRestart={vi.fn()} onPassword={vi.fn()}
    passwordWaitOpen={false} passwordFlowActive={false} onPasswordWaitClose={vi.fn()}
    revealedPassword={null} onClearRevealedPassword={vi.fn()} onOpenTasks={vi.fn()}
  />;
}

function ListHarness(props: { onPower: (vars: { force: boolean }) => void }) {
  const [confirm, setConfirm] = useState<VpsListActionConfirm | null>({ kind: 'stop', vpsId: 101, force: false });
  return confirm ? <VpsListActionConfirmDialog confirm={confirm} isAdminMode={false} onChange={setConfirm}
    onCancel={vi.fn()} onConfirmPower={props.onPower} onConfirmDelete={vi.fn()} /> : null;
}

function CardHarness(props: { onSubmit: (force: boolean) => void }) {
  const [force, setForce] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return <VpsPowerActionCard kind="stop" gate={{ allowed: true }} currentStateLabel="running"
    objectStateLabel="active" taskQueueLabel="ready" confirm={confirm} onConfirmChange={setConfirm}
    force={force} onForceChange={(next) => { setForce(next); setConfirm(false); }} pending={false}
    onSubmit={() => props.onSubmit(force)} onOpenTasks={vi.fn()} />;
}

describe.each([
  { locale: 'en', normal: 'Shutdown', forced: 'Poweroff', title: 'Shutdown VPS', forcedTitle: 'Poweroff VPS', normalAck: 'I understand this requests a graceful shutdown of the VPS.', forcedAck: 'I understand this requests a poweroff without a clean shutdown.' },
  { locale: 'cs', normal: 'Vypnout', forced: 'Vynutit vypnutí', title: 'Vypnout VPS', forcedTitle: 'Vynutit vypnutí VPS', normalAck: 'Rozumím, že tím požádám o řádné vypnutí VPS.', forcedAck: 'Rozumím, že tím požádám o vynucené vypnutí VPS bez řádného ukončení systému.' },
] as const)('VPS power controls in $locale', ({ locale, normal, forced, title, forcedTitle, normalAck, forcedAck }) => {
  beforeEach(() => { state.locale = locale; });

  it('changes the header confirmation label and submits the chosen force payload', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<HeaderHarness onStop={onStop} />);
    expect(screen.getByTestId('vps.action.stop_confirm')).toHaveTextContent(title);
    expect(screen.getByTestId('vps.action.stop_confirm.confirm')).toHaveTextContent(normal);
    await user.click(screen.getByTestId('vps.action.stop_confirm.confirm'));
    expect(onStop).toHaveBeenCalledWith(false);
    await user.click(screen.getByTestId('vps.action.stop_confirm.force'));
    expect(screen.getByTestId('vps.action.stop_confirm')).toHaveTextContent(forcedTitle);
    expect(screen.getByTestId('vps.action.stop_confirm.confirm')).toHaveTextContent(forced);
    await user.click(screen.getByTestId('vps.action.stop_confirm.confirm'));
    expect(onStop).toHaveBeenCalledWith(true);
  });

  it('changes the list confirmation label and submits force only after selection', async () => {
    const user = userEvent.setup();
    const onPower = vi.fn();
    render(<ListHarness onPower={onPower} />);
    expect(screen.getByTestId('vps.list.power_confirm.confirm')).toHaveTextContent(normal);
    await user.click(screen.getByTestId('vps.list.power_confirm.confirm'));
    expect(onPower).toHaveBeenCalledWith(expect.objectContaining({ kind: 'stop', force: false, vpsId: 101 }));
    await user.click(screen.getByTestId('vps.list.power_confirm.force'));
    expect(screen.getByTestId('vps.list.power_confirm')).toHaveTextContent(forcedTitle);
    expect(screen.getByTestId('vps.list.power_confirm.confirm')).toHaveTextContent(forced);
    await user.click(screen.getByTestId('vps.list.power_confirm.confirm'));
    expect(onPower).toHaveBeenCalledWith(expect.objectContaining({ kind: 'stop', force: true, vpsId: 101 }));
  });

  it('requires a fresh lifecycle acknowledgment when force changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CardHarness onSubmit={onSubmit} />);
    expect(screen.getByTestId('vps.lifecycle.stop.submit')).toHaveTextContent(normal);
    expect(screen.getByTestId('vps.lifecycle.stop.confirm').closest('label')).toHaveTextContent(normalAck);
    await user.click(screen.getByTestId('vps.lifecycle.stop.confirm'));
    expect(screen.getByTestId('vps.lifecycle.stop.submit')).toBeEnabled();
    await user.click(screen.getByTestId('vps.lifecycle.stop.submit'));
    expect(onSubmit).toHaveBeenCalledWith(false);
    await user.click(screen.getByTestId('vps.lifecycle.stop.force'));
    expect(screen.getByTestId('vps.lifecycle.stop.confirm')).not.toBeChecked();
    expect(screen.getByTestId('vps.lifecycle.stop.confirm').closest('label')).toHaveTextContent(forcedAck);
    expect(screen.getByTestId('vps.lifecycle.stop.submit')).toHaveTextContent(forced);
    expect(screen.getByTestId('vps.lifecycle.stop.submit')).toBeDisabled();
    await user.click(screen.getByTestId('vps.lifecycle.stop.confirm'));
    await user.click(screen.getByTestId('vps.lifecycle.stop.submit'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});
