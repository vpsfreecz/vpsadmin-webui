// i18n-ignore-file
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../app/i18n';
import { fetchHostIpAddresses } from '../../../lib/api/exports';
import { DnsZoneTransferCreateModal } from './DnsZoneTransferCreateModal';

const actor = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'user' }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: actor.role }) }));
vi.mock('../../../app/uiSettings', () => ({ useUiSettings: () => ({ settings: { language: 'en' } }) }));
vi.mock('../../../lib/api/exports', () => ({ fetchHostIpAddresses: vi.fn() }));

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const submit = vi.fn();
  function Dialog() {
    const [hostIpId, setHostIpId] = useState<number | null>(null);
    return <DnsZoneTransferCreateModal
      open onClose={vi.fn()} ownerUserId={42}
      hostIpId={hostIpId} onHostIpIdChange={setHostIpId}
      tsigKeyId="" onTsigKeyIdChange={vi.fn()} tsigOptions={[]}
      tsigLoading={false} tsigError={null} onRetryTsig={vi.fn()}
      createPending={false} createError={null} onSubmit={submit}
    />;
  }
  render(<QueryClientProvider client={queryClient}><I18nProvider><Dialog /></I18nProvider></QueryClientProvider>);
  return { submit };
}

afterEach(() => {
  actor.role = 'admin';
  vi.clearAllMocks();
});

describe('DNS transfer host IP selection', () => {
  it('uses the owner and eligibility filters for an exact address outside the suggestion sample', async () => {
    vi.mocked(fetchHostIpAddresses).mockImplementation(async (opts) => ({
      data: opts?.addr === '192.0.2.199' ? [{ id: 199, addr: '192.0.2.199' }] : [],
      envelope: { status: true, response: {} },
    }));
    const { submit } = renderDialog();
    const input = screen.getByTestId('dns.transfers.create.host_ip');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '192.0.2.199' } });
    expect(await screen.findByRole('option', { name: /192\.0\.2\.199/ })).toBeInTheDocument();
    expect(fetchHostIpAddresses).toHaveBeenCalledWith(expect.objectContaining({
      user: 42, usableFor: 'vps', routed: true, addr: '192.0.2.199',
    }));
    expect(vi.mocked(fetchHostIpAddresses).mock.calls.flatMap(([opts]) => Object.keys(opts ?? {}))).not.toContain('q');
    fireEvent.click(screen.getByRole('option', { name: /192\.0\.2\.199/ }));
    await waitFor(() => expect(screen.getByTestId('dns.transfers.create.submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('dns.transfers.create.submit'));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('blocks the owner filter and creation when the effective API role is not admin', () => {
    actor.role = 'user';
    renderDialog();
    expect(screen.getByTestId('dns.transfers.create.unsupported_filter')).toBeInTheDocument();
    expect(screen.getByTestId('dns.transfers.create.host_ip')).toBeDisabled();
    expect(screen.getByTestId('dns.transfers.create.submit')).toBeDisabled();
    expect(fetchHostIpAddresses).not.toHaveBeenCalled();
  });
});
