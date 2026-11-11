import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function expectReadableText(text: Locator) {
  const samples = await text.evaluateAll((elements) =>
    elements.map((element) => {
      const rgb = (color: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Color sampler unavailable');
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data).map((value, index) =>
          index === 3 ? value / 255 : value
        );
      };
      const composite = (front: number[], back: number[]) =>
        [0, 1, 2].map((i) => front[i]! * front[3]! + back[i]! * (1 - front[3]!)).concat(1);
      const ancestors: Element[] = [];
      let current: Element | null = element;
      while (current) {
        ancestors.unshift(current);
        current = current.parentElement;
      }
      let background = [255, 255, 255, 1];
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        if (Number(style.opacity) !== 1 || style.backgroundImage !== 'none')
          throw new Error('Unsupported compositing context');
        background = composite(rgb(style.backgroundColor), background);
      }
      const style = getComputedStyle(element);
      const foreground = composite(rgb(style.color), background);
      const luminance = (color: number[]) =>
        color.slice(0, 3).reduce((sum, value, index) => {
          const channel = value / 255;
          return (
            sum +
            (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) *
              [0.2126, 0.7152, 0.0722][index]!
          );
        }, 0);
      const a = luminance(foreground),
        b = luminance(background);
      return {
        text: element.textContent,
        foreground,
        background,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        size: style.fontSize,
        weight: style.fontWeight,
      };
    })
  );
  expect(samples.length).toBeGreaterThan(0);
  for (const sample of samples) expect.soft(sample.ratio, sample.text ?? 'lifecycle text').toBeGreaterThanOrEqual(4.5);
  return samples;
}

for (const cohort of ['action-index', 'admin-date-errors', 'member-snooze-error'] as const) {
  for (const language of ['cs', 'en'] as const)
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile Lifecycle readable text ${cohort} ${language} ${theme}`, async ({
        page,
      }, info) => {
        const errors: string[] = [],
          writes: string[] = [],
          measurements: unknown[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
            writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
        });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        await page.clock.setFixedTime(new Date('2026-11-11T12:00:00Z'));
        const member = cohort === 'member-snooze-error';
        const user = { id: 7, login: 'fixture-actor', level: member ? 1 : 100 };
        const vps = {
          id: 123,
          hostname: 'fixture-vps',
          object_state: 'active',
          is_running: true,
          enable_network: true,
          cpu: 2,
          memory: 2048,
          swap: 512,
          diskspace: 20480,
          user: { id: 7, login: 'fixture-owner' },
          node: { id: 1, domain_name: 'node.example.test', hypervisor_type: 'vpsadminos' },
          dns_resolver: null,
          expiration_date: '2099-01-01T00:00:00Z',
          remind_after_date: '2098-12-01T00:00:00Z',
        };
        await installHaveApiMock(page, {
          user,
          handlers: {
            'GET vpses/123': () => ({ vps }),
            'GET users/7': () => ({ user }),
            'GET ip_addresses': () => ({ ip_addresses: [] }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET vpses/123/statuses': () => ({ statuses: [] }),
          },
        });
        try {
          if (cohort === 'action-index') {
            await page.goto('/admin/vps/123/lifecycle');
            const titles = page.locator('[data-testid^="vps.lifecycle.action_link."] > span:first-child');
            await expect(titles).toHaveCount(12);
            for (const width of [1280, 768, 320]) {
              await page.setViewportSize({ width, height: 1000 });
              measurements.push({ width, samples: await expectReadableText(titles) });
              await page.screenshot({ path: info.outputPath(`index-${width}.png`) });
            }
            const link = page.getByTestId('vps.lifecycle.action_link.stop');
            await link.focus();
            await expect(link).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(page.getByTestId('vps.lifecycle.stop')).toBeVisible();
          } else if (cohort === 'admin-date-errors') {
            await page.goto('/admin/vps/123/lifecycle/lifetime');
            await page.getByTestId('lifetimes.admin.edit').click();
            const modal = page.getByTestId('lifetimes.admin.modal');
            const error = modal.getByText(language === 'cs' ? 'Neplatné datum/čas.' : 'Invalid date/time.', {
              exact: true,
            });
            const save = modal.getByRole('button', { name: language === 'cs' ? 'Uložit' : 'Save', exact: true });
            for (const field of ['expiration', 'remind_after']) {
              const input = page.getByTestId('lifetimes.admin.' + field),
                valid = await input.inputValue();
              expect(valid).not.toBe('');
              await input.fill('broken-date');
              await expect(error).toBeVisible();
              await expect(save).toBeDisabled();
              for (const width of [1280, 768, 320]) {
                await page.setViewportSize({ width, height: 1000 });
                measurements.push({ field, width, samples: await expectReadableText(error) });
                await page.screenshot({ path: info.outputPath(`${field}-${width}.png`) });
              }
              await page.screenshot({ path: info.outputPath(field + '.png') });
              await input.fill(valid);
              await expect(error).toHaveCount(0);
            }
            await modal.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
            await expect(modal).toBeHidden();
          } else {
            await page.goto('/app/vps/123');
            await page.getByTestId('lifetimes.user.snooze').click();
            const modal = page.getByTestId('lifetimes.snooze.modal');
            await page.getByTestId('lifetimes.snooze.preset').selectOption('custom');
            const error = modal.getByText(
              language === 'cs' ? 'Vyber platné datum/čas.' : 'Please pick a valid date/time.',
              { exact: true }
            );
            await expect(error).toBeVisible();
            await expect(modal.getByRole('button').last()).toBeDisabled();
            for (const width of [1280, 768, 320]) {
              await page.setViewportSize({ width, height: 1000 });
              measurements.push({ width, samples: await expectReadableText(error) });
              await page.screenshot({ path: info.outputPath(`snooze-${width}.png`) });
            }
            await page.screenshot({ path: info.outputPath('snooze.png') });
            await modal.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
            await expect(modal).toBeHidden();
          }
          expect(errors).toEqual([]);
          expect(writes).toEqual([]);
        } finally {
          await info.attach('contrast-observations', {
            body: JSON.stringify(
              {
                cohort,
                language,
                theme,
                measurements,
                errors,
                writes,
                fixtureOnly: true,
                limit:
                  'Nominal computed colors with alpha compositing, no opacity or background images; not full WCAG, live permissions or a physical display.',
              },
              null,
              2
            ),
            contentType: 'application/json',
          });
        }
      });
    }
}
