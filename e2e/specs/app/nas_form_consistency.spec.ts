import { test, expect } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage, failEnvelope } from '../../fixtures';
const contexts = [
  { actor: 'member', base: '/app', level: 1 },
  { actor: 'adminAll', base: '/admin', level: 99 },
  { actor: 'adminMy', base: '/app', level: 99 },
  { actor: 'supportMy', base: '/app', level: 21 },
];
const dataset = {
  id: 10,
  name: 'synthetic-parent',
  full_name: 'tank/synteticky-rodic-pro-overeni-dlouheho-kontextu-10',
  user: { id: 42, login: 'synthetic-owner' },
  parent: { id: 9 },
  vps: null,
  role: 'primary',
  object_state: 'active',
  used: 1024,
  avail: 10240,
  quota: 0,
  refquota: 10240,
  recordsize: 131072,
  compression: true,
  atime: false,
  relatime: false,
  sync: 'standard',
  snapshots_count: 0,
  mount_count: 0,
  export_count: 0,
};
for (const ctx of contexts)
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const)
    for (const scene of ['standalone', 'manage', 'child'] as const) {
      test(`@pr-smoke @pr-smoke-mobile NAS form consistency ${ctx.actor} ${scene} ${language}`, async ({
        page,
      }, info) => {
        const writes: string[] = [],
          errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.clock.setFixedTime(new Date('2026-01-24T12:00:00Z'));
        await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
        await setUiSettingsLocalStorage(page, { language, theme });
        await installHaveApiMock(page, {
          user: { id: 42, login: 'synthetic-owner', level: ctx.level },
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
        await page.goto(ctx.base + (scene === 'standalone' ? '/nas/new' : '/nas/10'));
        if (scene === 'child') await page.getByTestId('dataset.manage.create.open').click();
        const root = page.getByTestId(
          scene === 'standalone'
            ? 'nas.create.form'
            : scene === 'child'
              ? 'dataset.manage.create.modal'
              : 'dataset.manage'
        );
        await expect(root).toBeVisible({ timeout: 30_000 });
        const summary = page.getByTestId(
          scene === 'standalone'
            ? 'nas.create.advanced_properties.summary'
            : scene === 'child'
              ? 'dataset.manage.create.advanced_properties.summary'
              : 'dataset.manage.advanced_properties.summary'
        );
        const details = summary.locator('..');
        await expect(summary).toBeVisible();
        expect(await details.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
        const draft = page.getByTestId(
          scene === 'standalone'
            ? 'nas.create.name'
            : scene === 'child'
              ? 'dataset.manage.create.name'
              : 'dataset.manage.refquota'
        );
        await draft.fill(scene === 'manage' ? '12' : 'synthetic-child');
        if (scene === 'standalone') await page.getByTestId('nas.create.parent').selectOption('10');
        const submit = page.getByTestId(
          scene === 'standalone'
            ? 'nas.create.submit'
            : scene === 'child'
              ? 'dataset.manage.create.submit'
              : 'dataset.manage.edit.submit'
        );
        await expect(submit).toBeEnabled();
        const phases = [];
        for (const width of [...new Set([page.viewportSize()!.width, 320])])
          for (const opened of [false, true]) {
            await page.setViewportSize({ width, height: 900 });
            if ((await details.evaluate((e) => (e as HTMLDetailsElement).open)) !== opened) {
              await summary.focus();
              await page.keyboard.press('Enter');
              await expect.poll(() => details.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(opened);
            }
            const fields = await root.locator('label input:not([type=checkbox]),label select').evaluateAll((es) =>
              es
                .filter((e) => e.getBoundingClientRect().height > 0)
                .map((e) => {
                  const r = e.getBoundingClientRect(),
                    label = e.closest('label')!,
                    heading = label.firstElementChild!,
                    b = heading.getBoundingClientRect();
                  return {
                    id: e.getAttribute('data-testid'),
                    gap: r.top - b.bottom,
                    height: r.height,
                    labelText: heading.textContent,
                    fontWeight: getComputedStyle(heading).fontWeight,
                    labelRect: b.toJSON(),
                    fieldRect: r.toJSON(),
                  };
                })
            );
            const footer = await submit.evaluate((e) => {
              const p = e.parentElement!,
                r = e.getBoundingClientRect(),
                b = p.getBoundingClientRect();
              return {
                justify: getComputedStyle(p).justifyContent,
                submitRightGap: b.right - r.right,
                submitRect: r.toJSON(),
                footerRect: b.toJSON(),
                domOrder: [...p.children].map((c) => ({ text: c.textContent, primary: c === e, tag: c.tagName })),
              };
            });
            const disclosure = await summary.evaluate((e) => ({
              display: getComputedStyle(e).display,
              listStyleType: getComputedStyle(e).listStyleType,
              marker: getComputedStyle(e, '::marker').content,
              svgCount: e.querySelectorAll('svg').length,
              text: e.textContent,
              open: (e.parentElement as HTMLDetailsElement).open,
              height: e.getBoundingClientRect().height,
            }));
            const geometry = await page.evaluate(() => ({
              viewport: innerWidth,
              document: document.documentElement.scrollWidth,
            }));
            expect(geometry.document).toBeLessThanOrEqual(width + 1);
            for (const f of fields) {
              expect(f.height).toBe(info.project.name === 'chromium' ? 36 : 44);
              expect(f.gap).toBe(4);
              expect(Math.abs(f.fieldRect.left - f.labelRect.left)).toBeLessThanOrEqual(1);
              expect(f.fontWeight).toBe('600');
              expect(f.fieldRect.left).toBeGreaterThanOrEqual(-1);
              expect(f.fieldRect.right).toBeLessThanOrEqual(width + 1);
            }
            await expect(draft).toHaveValue(scene === 'manage' ? '12' : 'synthetic-child');
            expect(fields.length).toBeGreaterThan(0);
            expect(footer.justify).toBe('flex-end');
            expect(Math.abs(footer.submitRightGap)).toBeLessThanOrEqual(1);
            expect(footer.domOrder.at(-1)?.primary).toBe(true);
            expect(disclosure.display).toBe('flex');
            expect(disclosure.svgCount).toBe(1);
            expect(disclosure.height).toBeGreaterThanOrEqual(44);
            await expect
              .poll(() =>
                summary.locator('svg').evaluate((element) => {
                  const style = getComputedStyle(element);
                  const degrees = Number.parseFloat(style.rotate.split(' ').at(-1) ?? '') || 0;
                  return new DOMMatrix(style.transform).a * Math.cos((degrees * Math.PI) / 180);
                })
              )
              .toBeCloseTo(opened ? -1 : 1, 4);
            await summary.focus();
            await page.keyboard.press('Tab');
            await page.keyboard.press('Shift+Tab');
            await expect(summary).toBeFocused();
            expect(await summary.evaluate((e) => e.matches(':focus-visible'))).toBe(true);
            phases.push({ width, opened, fields, footer, disclosure, geometry });
            if (ctx.actor === 'member' && language === 'cs' && width === 320 && opened)
              await root.screenshot({ path: info.outputPath(scene + '-working-320.png'), animations: 'disabled' });
          }
        const footerActions = submit.locator('..').locator('button:visible,a:visible');
        if ((await footerActions.count()) === 2) {
          await footerActions.first().focus();
          await page.keyboard.press('Tab');
          await expect(submit).toBeFocused();
          expect(await submit.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
        }
        await summary.focus();
        await page.keyboard.press('Space');
        await expect.poll(() => details.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
        await expect(draft).toHaveValue(scene === 'manage' ? '12' : 'synthetic-child');
        if (info.project.name !== 'chromium') {
          await summary.tap();
          await expect.poll(() => details.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(true);
          await summary.tap();
          await expect.poll(() => details.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
        }
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
        await info.attach('nas-consistency', {
          contentType: 'application/json',
          body: JSON.stringify(
            { ctx, language, theme, scene, phases, writes, errors, fixtureOnly: true, liveWrites: 0 },
            null,
            2
          ),
        });
      });
    }
for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const)
  for (const scene of ['standalone', 'manage'] as const) {
    test(`@pr-smoke @pr-smoke-mobile NAS supportAll negative ${scene} ${language}`, async ({ page }, info) => {
      const writes: string[] = [],
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-support', level: 21 },
        handlers: {
          'GET datasets': () => ({ datasets: [dataset] }),
          'GET datasets/10': () => ({ dataset }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
        },
      });
      await page.route('**/api/**', (r) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(r.request().method())) {
          writes.push(r.request().method());
          return r.abort();
        }
        return r.fallback();
      });
      await page.goto('/admin' + (scene === 'standalone' ? '/nas/new' : '/nas/10'));
      if (scene === 'standalone') {
        await expect(page.getByTestId('nas.create.form')).toBeVisible();
        await expect(page.getByTestId('nas.create.name')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('dataset.manage.edit.submit')).toBeDisabled();
        await expect(page.getByTestId('dataset.manage.create.open')).toHaveCount(0);
      }
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('nas-negative', {
        contentType: 'application/json',
        body: JSON.stringify(
          { language, theme, scene, writes, errors, fixtureRoleOnly: true, notLivePermissionAudit: true },
          null,
          2
        ),
      });
    });
  }

for (const ctx of [contexts[0]!, contexts[1]!])
  for (const scene of ['standalone', 'manage', 'child'] as const)
    for (const advanced of [false, true]) {
      test(`@pr-smoke @pr-smoke-mobile NAS rejected payload ${ctx.actor} ${scene} advanced=${advanced}`, async ({
        page,
      }, info) => {
        const calls: { method: string; path: string; dataset: unknown }[] = [];
        const unexpected: string[] = [],
          errors: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
        await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
        const method = scene === 'manage' ? 'PUT' : 'POST';
        const path = scene === 'manage' ? 'datasets/10' : 'datasets';
        await installHaveApiMock(page, {
          user: { id: 42, login: 'synthetic-owner', level: ctx.level },
          handlers: {
            'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
            'GET datasets/10': () => ({ dataset }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET help_boxes': () => ({ help_boxes: [] }),
            'GET action_states': () => ({ action_states: [] }),
            [method + ' ' + path]: (request) => {
              calls.push({ method: request.method, path: request.pathname, dataset: request.params['dataset'] });
              return failEnvelope('Synthetic form rejection');
            },
          },
        });
        await page.route('**/api/**', (route) => {
          const request = route.request();
          if (
            !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
            !(request.method() === method && new URL(request.url()).pathname === '/api/v7.0/' + path)
          ) {
            unexpected.push(request.method() + ' ' + new URL(request.url()).pathname);
            return route.abort();
          }
          return route.fallback();
        });
        await page.goto(ctx.base + (scene === 'standalone' ? '/nas/new' : '/nas/10'));
        if (scene === 'child') await page.getByTestId('dataset.manage.create.open').click();
        const prefix =
          scene === 'standalone' ? 'nas.create' : scene === 'child' ? 'dataset.manage.create' : 'dataset.manage';
        const draft = page.getByTestId(prefix + (scene === 'manage' ? '.refquota' : '.name'));
        await draft.fill(scene === 'manage' ? '12' : 'synthetic-child');
        if (scene === 'manage' && advanced) await page.getByTestId('dataset.manage.quota').fill('0');
        if (scene === 'standalone') await page.getByTestId('nas.create.parent').selectOption('10');
        if (scene !== 'manage') await page.getByTestId(prefix + '.refquota').fill('8');
        const summary = page.getByTestId(prefix + '.advanced_properties.summary');
        if (scene === 'manage' && !advanced) {
          await summary.click();
          await summary.click();
        }
        if (advanced) {
          await summary.click();
          await page.getByTestId(prefix + '.compression').uncheck();
          const recordsize = page.getByTestId(prefix + '.recordsize');
          if (await recordsize.evaluate((e) => e.tagName === 'SELECT')) await recordsize.selectOption('64');
          else await recordsize.fill('64');
          await summary.click();
          await expect.poll(() => summary.locator('..').evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
        }
        const submit = page.getByTestId(scene === 'manage' ? 'dataset.manage.edit.submit' : prefix + '.submit');
        await expect(submit).toBeEnabled();
        await submit.click();
        await expect.poll(() => calls.length).toBe(1);
        const expected: Record<string, unknown> =
          scene === 'manage'
            ? { ...(advanced ? { quota: 0 } : {}), refquota: 12288 }
            : { dataset: 10, name: 'synthetic-child', automount: true, refquota: 8192 };
        if (advanced) {
          Object.assign(expected, {
            compression: false,
            recordsize: 65536,
            atime: false,
            relatime: false,
            sync: 'standard',
          });
          if (scene === 'child' && ctx.level === 99)
            Object.assign(expected, { sharenfs: '', admin_override: false, admin_lock_type: 'no_lock' });
        }
        expect(calls[0]?.dataset).toEqual(expected);
        await expect(page.getByText('Synthetic form rejection', { exact: true })).toBeVisible();
        await expect(submit).toBeEnabled();
        await expect(draft).toHaveValue(scene === 'manage' ? '12' : 'synthetic-child');
        if (advanced) {
          await summary.click();
          await expect(page.getByTestId(prefix + '.compression')).not.toBeChecked();
          await expect(page.getByTestId(prefix + '.recordsize')).toHaveValue('64');
        }
        expect(unexpected).toEqual([]);
        expect(errors).toEqual([]);
        await info.attach('nas-rejected-payload', {
          contentType: 'application/json',
          body: JSON.stringify({ ctx, scene, advanced, calls, unexpected, errors, fixtureOnly: true, liveWrites: 0 }),
        });
      });
    }

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const)
  for (const scene of ['snapshot', 'inline', 'register', 'edit', 'addSpace'] as const) {
    test(`@pr-smoke @pr-smoke-mobile NAS related footer acceptance ${scene} ${language}`, async ({ page }, info) => {
      const writes: string[] = [],
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.clock.setFixedTime(new Date('2026-01-24T12:00:00Z'));
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme });
      const active = scene === 'edit' || scene === 'addSpace';
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-owner', level: 99 },
        handlers: {
          'GET datasets/10': () => ({
            dataset: {
              id: 10,
              name: 'synthetic-child',
              full_name: 'tank/synteticky-rodic/child',
              user: { id: 42, login: 'synthetic-owner' },
              parent: { id: 9 },
              vps: { id: 300, hostname: 'fixture.invalid' },
              role: 'primary',
              object_state: 'active',
              used: 1024,
              avail: 10240,
              quota: 0,
              refquota: 10240,
              recordsize: 131072,
              compression: true,
              atime: false,
              relatime: false,
              sync: 'standard',
              snapshots_count: 0,
              mount_count: 0,
              export_count: 0,
              ...(active ? { dataset_expansion: { id: 9 } } : {}),
            },
          }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET datasets/10/snapshots': () => ({ snapshots: [] }),
          'GET dataset_expansions/9': () => ({
            dataset_expansion: {
              id: 9,
              state: 'active',
              added_space: 10240,
              original_refquota: 10240,
              enable_notifications: true,
              enable_shrink: true,
              stop_vps: true,
              over_refquota_seconds: 3600,
              max_over_refquota_seconds: 7200,
              created_at: '2026-01-23T10:00:00Z',
            },
          }),
          'GET dataset_expansions/9/history': () => ({ histories: [] }),
        },
      });
      await page.route('**/api/**', (r) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(r.request().method())) {
          writes.push(r.request().method() + ' ' + new URL(r.request().url()).pathname);
          return r.abort();
        }
        return r.fallback();
      });
      await page.goto('/admin/datasets/10/' + (scene === 'snapshot' ? 'snapshots?action=create' : 'expansion'));
      if (scene === 'register') await page.getByTestId('dataset.expansion.register.open').click();
      if (scene === 'edit') await page.getByTestId('dataset.expansion.edit.open').click();
      if (scene === 'addSpace') await page.getByTestId('dataset.expansion.add_space.open').click();
      const id =
        scene === 'snapshot'
          ? 'dataset.snapshots.create.submit'
          : scene === 'inline'
            ? 'dataset.expansion.create.submit'
            : scene === 'register'
              ? 'dataset.expansion.register.submit'
              : scene === 'edit'
                ? 'dataset.expansion.edit.submit'
                : 'dataset.expansion.add_space.submit';
      const primary = page.getByTestId(id);
      await expect(primary).toBeVisible();
      const phases = [];
      for (const width of [...new Set([page.viewportSize()!.width, 320])]) {
        await page.setViewportSize({ width, height: 900 });
        await primary.scrollIntoViewIfNeeded();
        const footer = await primary.evaluate((e) => {
          const p = e.parentElement!,
            r = e.getBoundingClientRect(),
            b = p.getBoundingClientRect();
          return {
            justify: getComputedStyle(p).justifyContent,
            rightGap: b.right - r.right,
            rect: r.toJSON(),
            footerRect: b.toJSON(),
            children: [...p.children].map((c) => ({ text: c.textContent, primary: c === e, tag: c.tagName })),
          };
        });
        const geometry = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(geometry.document).toBeLessThanOrEqual(width + 1);
        expect(footer.justify).toBe('flex-end');
        expect(Math.abs(footer.rightGap)).toBeLessThanOrEqual(1);
        expect(footer.children.at(-1)?.primary).toBe(true);
        await primary.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(primary).toBeFocused();
        expect(await primary.evaluate((e) => e.matches(':focus-visible'))).toBe(true);
        phases.push({ width, footer, geometry });
        if (scene === 'inline' && width === 320)
          await primary
            .locator('..')
            .screenshot({ path: info.outputPath('inline-footer-working.png'), animations: 'disabled' });
      }
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('nas-related-footer', {
        contentType: 'application/json',
        body: JSON.stringify({
          scene,
          language,
          theme,
          phases,
          writes,
          errors,
          baselineCollectionOnly: false,
          fixtureOnly: true,
        }),
      });
    });
  }
