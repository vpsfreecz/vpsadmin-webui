import { expect, test } from '@playwright/test';
import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'admin-my'] as const) {
    for (const section of ['traffic', 'live'] as const) {
      test(`@pr-smoke @pr-smoke-mobile compact network summary preserves measurements and read states: ${section}, ${role}, ${language}`, async ({
        page,
      }, info) => {
        await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'));
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'NETWORK_SUMMARY_TABLES',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
        let state: 'normal' | 'zero' | 'missing' | 'past' | 'empty' | 'error' = 'normal';
        const netif = { id: 501, name: 'eth0', vps: { id: 123, hostname: 'summary.example.test', user: { id: 7 } } };
        const owners: Array<string | null> = [];
        await installHaveApiMock(page, {
          user: { id: 7, login: 'synthetic-network-summary', level: role === 'member' ? 1 : 99 },
          handlers: {
            'GET network_interface_accountings': ({ searchParams }) => {
              owners.push(searchParams.get('network_interface_accounting[user]'));
              if (state === 'error') return jsonFulfill(failEnvelope('Synthetic unavailable'), 503);
              const year = Number(searchParams.get('network_interface_accounting[year]') ?? 2026);
              const month = Number(searchParams.get('network_interface_accounting[month]') ?? 11);
              if (state === 'empty' || (state === 'past' && month === 11)) return { network_interface_accountings: [] };
              return {
                network_interface_accountings: [
                  {
                    id: month,
                    year,
                    month,
                    network_interface: netif,
                    bytes_in: state === 'missing' ? null : state === 'zero' ? 0 : 1024,
                    bytes_out: state === 'missing' ? null : state === 'zero' ? 0 : 2048,
                    bytes: state === 'missing' ? null : state === 'zero' ? 0 : 3072,
                  },
                ],
              };
            },
            'GET network_interface_monitors': ({ searchParams }) => {
              owners.push(searchParams.get('network_interface_monitor[user]'));
              if (state === 'error') return jsonFulfill(failEnvelope('Synthetic unavailable'), 503);
              if (state === 'empty') return { network_interface_monitors: [] };
              return {
                network_interface_monitors: [
                  {
                    id: 501,
                    network_interface: netif,
                    delta: 2,
                    bytes_in: state === 'missing' ? null : state === 'zero' ? 0 : 2048,
                    bytes_out: state === 'missing' ? null : state === 'zero' ? 0 : 1024,
                    packets_in: state === 'missing' ? null : state === 'zero' ? 0 : 100,
                    packets_out: state === 'missing' ? null : state === 'zero' ? 0 : 50,
                    updated_at: '2026-11-18T12:00:00Z',
                  },
                ],
              };
            },
          },
        });
        await page.goto(`/app/networking?tab=${section}`);
        const card = page.getByTestId(`network.user.${section}`);
        const summary = page.getByTestId(`network.user.${section}.summary`);
        await expect(summary.getByRole('table')).toBeVisible();
        await expect(page.getByTestId(`network.user.${section}.stat.in`)).toContainText(
          section === 'traffic' ? '1.00 KiB' : '1.00 KiB/s'
        );
        await expect(page.getByTestId(`network.user.${section}.stat.out`)).toContainText(
          section === 'traffic' ? '2.00 KiB' : '512 B/s'
        );
        if (section === 'traffic') {
          await expect(summary).toContainText('2026/11');
          await expect(page.getByTestId('network.user.traffic.stat.total')).toContainText('3.00 KiB');
        } else await expect(summary).toContainText('50/s');
        expect((await summary.boundingBox())!.height).toBeLessThan(180);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`network-summary-${section}-${role}-${language}.png`),
          fullPage: true,
          scale: 'css',
        });
        const refresh = card.getByRole('button', { name: language === 'cs' ? 'Obnovit' : 'Refresh', exact: true });
        state = 'zero';
        await refresh.click();
        await expect(page.getByTestId(`network.user.${section}.stat.in`)).toHaveText(
          section === 'traffic' ? '0 B' : '0 B/s'
        );
        state = 'missing';
        await refresh.click();
        await expect(page.getByTestId(`network.user.${section}.stat.in`)).toHaveText('—');
        await expect(page.getByTestId(`network.user.${section}.stat.out`)).toHaveText('—');
        if (section === 'traffic') {
          state = 'past';
          await refresh.click();
          await expect(page.getByTestId('network.user.traffic.stat.total')).toHaveText('—');
        }
        state = 'empty';
        await refresh.click();
        await expect(page.getByTestId(`network.user.${section}.empty`)).toBeVisible();
        await expect(summary).toHaveCount(0);
        state = 'error';
        await refresh.click();
        await expect(page.getByTestId(`network.user.${section}.error`)).toBeVisible();
        await expect(summary).toHaveCount(0);
        expect(owners.length).toBeGreaterThan(0);
        expect(owners.every((owner) => owner === (role === 'member' ? null : '7'))).toBe(true);
      });
    }
  }
}
