// i18n-ignore-file
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { afterEach, it, vi } from 'vitest';

import { I18nProvider } from '../../../app/i18n';
import { VpsNetworkInterfacesCard } from './VpsNetworkInterfacesCard';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'cs' }));
vi.mock('../../../app/uiSettings', () => ({
  useUiSettings: () => ({ settings: { language: language.value } }),
}));

afterEach(() => { language.value = 'en'; });

it.each([
  ['en', '2 IP addresses'],
  ['cs', '2 IP adres'],
] as const)('renders the mobile IP count in %s with its real catalog', async (lang, expected) => {
  language.value = lang;
  render(
    <I18nProvider>
      <VpsNetworkInterfacesCard
        canAdmin={false}
        canMutate={false}
        isLoading={false}
        errorMessage={null}
        netifs={[{ id: 1, name: 'eth0' }]}
        ipByNetif={new Map([[1, [
          { id: 2, addr: '192.0.2.1' },
          { id: 3, addr: '192.0.2.2' },
        ]]])}
        onRefresh={vi.fn()}
        onEdit={vi.fn()}
      />
    </I18nProvider>,
  );
  const card = screen.getByTestId('vps.network.interfaces.card.1');
  expect(await within(card).findByText(expected, {}, { timeout: 5000 })).toBeInTheDocument();
  expect(card).not.toHaveTextContent('{count}');
});
