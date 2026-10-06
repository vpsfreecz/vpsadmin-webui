// i18n-ignore-file
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IpAddress } from '../../../lib/api/ipAddresses';
import { UserNetworkAddressActions } from './UserNetworkAddressActions';

vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

function renderActions(ip: IpAddress, assigned = false) {
  const onAssign = vi.fn();
  render(
    <MemoryRouter>
      <UserNetworkAddressActions ip={ip} assigned={assigned} vpsId={assigned ? 7 : null}
        basePath="/app" onAssign={onAssign} />
    </MemoryRouter>,
  );
  return onAssign;
}

describe('owned network address actions', () => {
  it('prevents disabled detached assignment and explains the retained address', () => {
    const onAssign = renderActions({ id: 42, network: { id: 12, enabled: false } });
    const button = screen.getByTestId('network.user.ip.42.assign');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'admin.cluster.networks.enabled.help');
    fireEvent.click(button);
    expect(onAssign).not.toHaveBeenCalled();
  });

  it.each([true, undefined])('retains assignment for enabled or unknown state (%s)', (enabled) => {
    const ip = { id: 42, network: { id: 12, enabled } };
    const onAssign = renderActions(ip);
    const button = screen.getByTestId('network.user.ip.42.assign');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onAssign).toHaveBeenCalledWith(ip);
  });

  it('keeps an assigned VPS link usable while its network is disabled', () => {
    const onAssign = renderActions({ id: 42, network: { id: 12, enabled: false } }, true);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/vps/7/network');
    expect(screen.queryByTestId('network.user.ip.42.assign')).not.toBeInTheDocument();
    expect(onAssign).not.toHaveBeenCalled();
  });
});
