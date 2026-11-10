import { test, expect } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
const cases = [
  {
    scene: 'both-distinct',
    values: { used: 9000, referenced: 1000, quota: 20000, refquota: 10000 },
    reference: 10,
    total: 45,
  },
  {
    scene: 'quota-only',
    values: { used: 9500, referenced: 1000, quota: 10000, refquota: 0 },
    reference: null,
    total: 95,
  },
  {
    scene: 'reference-warning',
    values: { used: 14000, referenced: 9500, quota: 0, refquota: 10000 },
    reference: 95,
    total: null,
  },
  {
    scene: 'reference-over',
    values: { used: 14000, referenced: 11000, quota: 0, refquota: 10000 },
    reference: 110,
    total: null,
  },
  {
    scene: 'reference-zero',
    values: { used: 1000, referenced: 0, quota: 0, refquota: 10000 },
    reference: 0,
    total: null,
  },
  { scene: 'unlimited', values: { used: 9000, referenced: 1000, quota: 0, refquota: 0 }, reference: null, total: null },
  {
    scene: 'missing-reference',
    values: { used: 9000, referenced: null, quota: 0, refquota: 10000 },
    reference: undefined,
    total: null,
  },
  {
    scene: 'unknown-limits',
    values: { used: 9000, referenced: 1000, quota: null, refquota: null },
    reference: null,
    total: null,
  },
] as const;
const actors = [
  { actor: 'member', base: '/app', level: 1 },
  { actor: 'adminAll', base: '/admin', level: 99 },
  { actor: 'adminMy', base: '/app', level: 99 },
  { actor: 'supportMy', base: '/app', level: 21 },
] as const;
for (const actor of actors)
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const)
    for (const cfg of cases) {
      if (actor.actor !== 'member' && !['both-distinct', 'unlimited'].includes(cfg.scene)) continue;
      test(`@pr-smoke @pr-smoke-mobile NAS capacity ${actor.actor} ${cfg.scene} ${language}`, async ({
        page,
      }, info) => {
        const errors: string[] = [],
          writes: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.clock.setFixedTime(new Date('2026-01-24T12:00:00Z'));
        await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
        await setUiSettingsLocalStorage(page, { language, theme });
        const dataset = {
          id: 10,
          name: '318',
          ...cfg.values,
          avail: 50000,
          user: { id: 42, login: 'synthetic-owner' },
          parent: { id: 9 },
          vps: null,
          object_state: 'active',
          role: 'primary',
          recordsize: 131072,
          compression: true,
          atime: false,
          relatime: false,
          sync: 'standard',
        };
        await installHaveApiMock(page, {
          user: { id: 42, login: 'synthetic-owner', level: actor.level },
          handlers: {
            'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
            'GET datasets/10': () => ({ dataset }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET help_boxes': () => ({ help_boxes: [] }),
            'GET action_states': () => ({ action_states: [] }),
          },
        });
        await page.route('**/api/**', (r) => {
          if (!['GET', 'HEAD', 'OPTIONS'].includes(r.request().method())) {
            writes.push(r.request().method() + ' ' + new URL(r.request().url()).pathname);
            return r.abort();
          }
          return r.fallback();
        });
        const observations = [];
        for (const width of [1280, 320])
          for (const scene of ['list', 'detail']) {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto(actor.base + '/nas' + (scene === 'detail' ? '/10' : ''));
            const root = page.getByTestId(
              scene === 'detail' ? 'dataset.overview.space' : width === 320 ? 'datasets.card.10' : 'datasets.row.10'
            );
            await expect(root).toBeVisible({ timeout: 30000 });
            for (const [kind, percent] of [
              ['reference', cfg.reference],
              ['quota', cfg.total],
            ] as const) {
              const group = root.getByTestId('dataset.usage.' + kind);
              if (percent === null) {
                await expect(group).toHaveCount(1);
                await expect(group.getByRole('img')).toHaveCount(0);
                const rawLimit = kind === 'reference' ? cfg.values.refquota : cfg.values.quota;
                await expect(group).toContainText(rawLimit === 0 ? '∞' : '—');
                continue;
              }
              await expect(group).toHaveCount(1);
              const bar = group.getByRole('img');
              if (percent === undefined) {
                await expect(bar).toHaveCount(0);
                await expect(group).toContainText('—');
                continue;
              }
              await expect(bar).toHaveCount(1);
              await expect(bar).toHaveAttribute('aria-label', new RegExp(percent + '%'));
              await expect(group).toContainText(percent + '%');
              if (percent > 0) {
                const color = percent >= 98 ? 'danger' : percent >= 80 ? 'warn' : 'ok';
                await expect(bar.locator('.bg-' + color)).toHaveCount(1);
                const widthPercent = await bar.locator('.bg-' + color).evaluate((e) => (e as HTMLElement).style.width);
                expect(widthPercent).toBe(Math.min(100, percent) + '%');
              }
            }
            if (cfg.scene === 'unlimited' || cfg.scene === 'unknown-limits') {
              await expect(root.getByRole('img')).toHaveCount(0);
              const text = await root.innerText();
              expect(text).not.toMatch(/\d+%/);
              expect(text.includes('∞')).toBe(cfg.scene === 'unlimited');
              await expect(root).toContainText('8.8 GiB');
              if (scene === 'detail') expect((text.match(/8\.8 GiB/g) ?? []).length).toBe(1);
            }
            if (scene === 'detail') {
              const label = language === 'cs' ? 'Referenční kvóta' : 'Reference quota';
              await expect(root.getByText(label, { exact: true })).toHaveCount(1);
            } else {
              await expect(root.getByRole('link', { name: '318', exact: true })).toHaveAttribute(
                'href',
                actor.base + '/nas/10'
              );
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            observations.push({
              width,
              scene,
              text: await root.innerText(),
              bars: await root
                .getByRole('img')
                .evaluateAll((es) => es.map((e) => ({ label: e.getAttribute('aria-label'), html: e.outerHTML }))),
            });
            if (width === 320 && scene === 'detail' && actor.actor === 'member' && language === 'cs')
              await root.screenshot({ path: info.outputPath(cfg.scene + '-space-working.png') });
          }
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
        await info.attach('nas-capacity', {
          body: JSON.stringify({
            actor,
            config: cfg,
            language,
            theme,
            observations,
            writes,
            errors,
            fixtureOnly: true,
            liveWrites: 0,
          }),
          contentType: 'application/json',
        });
      });
    }
