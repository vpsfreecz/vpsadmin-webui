import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { VpsHostAssignmentDialog } from './VpsHostAssignmentDialog';

vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

describe('host address parent confirmation', () => {
  test.each([true, false])('confirms the existing parent without a target selector (eligible %s)', eligible => {
    const onConfirm = vi.fn();
    render(<VpsHostAssignmentDialog host={{ id: 8, addr: '192.0.2.8', assigned: false }} parent={{ id: 4, name: 'eth4' }}
      vpsId={42} objectLabel="example" eligible={eligible} pending={false} error={null} onClose={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByTestId('vps.network.host_addresses.assign.interface')).toHaveTextContent('eth4');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('vps.network.host_addresses.assign.submit'));
    expect(onConfirm).toHaveBeenCalledTimes(eligible ? 1 : 0);
  });
});
