// i18n-ignore-file
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { afterEach, it, vi } from 'vitest';

import { I18nProvider, useI18n } from '../../../app/i18n';
import { VpsNetworkInterfacesCard } from './VpsNetworkInterfacesCard';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'cs' }));
vi.mock('../../../app/uiSettings', () => ({
  useUiSettings: () => ({ settings: { language: language.value } }),
}));

afterEach(() => { language.value = 'en'; });

it.each([
  ['en', 0, '0 IP addresses'],
  ['en', 1, '1 IP address'],
  ['en', 2, '2 IP addresses'],
  ['en', 4, '4 IP addresses'],
  ['en', 5, '5 IP addresses'],
  ['en', 11, '11 IP addresses'],
  ['cs', 0, '0 IP adres'],
  ['cs', 1, '1 IP adresa'],
  ['cs', 2, '2 IP adresy'],
  ['cs', 4, '4 IP adresy'],
  ['cs', 5, '5 IP adres'],
  ['cs', 11, '11 IP adres'],
] as const)('renders %s mobile IP count %i with the real catalog', async (lang, count, expected) => {
  language.value = lang;
  const ips = Array.from({ length: count }, (_, index) => ({
    id: index + 2,
    addr: `192.0.2.${index + 1}`,
  }));
  render(
    <I18nProvider>
      <VpsNetworkInterfacesCard
        canAdmin={false}
        canMutate={false}
        isLoading={false}
        errorMessage={null}
        netifs={[{ id: 1, name: 'eth0' }]}
        ipByNetif={new Map([[1, ips]])}
        onRefresh={vi.fn()}
        onEdit={vi.fn()}
      />
    </I18nProvider>,
  );
  const card = screen.getByTestId('vps.network.interfaces.card.1');
  expect(await within(card).findByText(expected, {}, { timeout: 5000 })).toBeInTheDocument();
  expect(card).not.toHaveTextContent('{count}');
});

function CountProbe({ count }: { count: number }) {
  const { tc } = useI18n();
  return <span>{tc('vps.network.ip_addresses.count', count)}</span>;
}

it.each([
  ['en', 0, '0 addresses'],
  ['en', 1, '1 address'],
  ['en', 2, '2 addresses'],
  ['en', 4, '4 addresses'],
  ['en', 5, '5 addresses'],
  ['en', 11, '11 addresses'],
  ['en', 1.5, '1.5 addresses'],
  ['cs', 0, '0 adres'],
  ['cs', 1, '1 adresa'],
  ['cs', 2, '2 adresy'],
  ['cs', 4, '4 adresy'],
  ['cs', 5, '5 adres'],
  ['cs', 11, '11 adres'],
  ['cs', 1.5, '1.5 adresy'],
] as const)('renders %s address plural %i with interpolation', async (lang, count, expected) => {
  language.value = lang;
  render(<I18nProvider><CountProbe count={count} /></I18nProvider>);
  expect(await screen.findByText(expected, {}, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.queryByText(/\{count\}/u)).not.toBeInTheDocument();
});
