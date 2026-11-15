import type { Locator } from '@playwright/test';

import { expect, test } from '../../fixtures/bootstrap';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { withAppUrl } from '../../fixtures/url';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function expectTouchSize(control: Locator) {
  const rect = await control.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect?.height).toBeGreaterThanOrEqual(44);
  expect(rect?.width).toBeGreaterThanOrEqual(44);
}

async function expectReadableButton(control: Locator) {
  const colors = await control.evaluate((el) => {
    const style = getComputedStyle(el);
    return { color: style.color, background: style.backgroundColor };
  });
  function luminance(rgb: string) {
    const values = rgb.match(/\d+(?:\.\d+)?/g)?.map(Number);
    if (!values || values.length < 3) throw Error('Expected opaque button RGB colors');
    if (values.length === 4 && values[3] !== 1) throw Error('Transparent button surface needs compositing');
    return values.slice(0, 3).reduce((sum, value, index) => {
      const s = value / 255;
      const linear = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
    }, 0);
  }
  const a = luminance(colors.color),
    b = luminance(colors.background);
  expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
}

for (const role of ['member', 'support', 'admin'] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`@pr-smoke @pr-smoke-mobile namespace controls preserve ${role} scope and navigation (${language})`, async ({
      page,
      hasTouch,
    }) => {
      await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const user = {
        id: 7,
        login: 'namespace-controls-fixture',
        level: role === 'admin' ? 99 : role === 'support' ? 21 : 1,
      };
      const namespaces = [
        { id: 21, size: 65536, user, block_count: 1 },
        { id: 22, size: 131072, user, block_count: 1 },
      ];
      const maps = [
        { id: 71, label: 'First fixture map', user_namespace: namespaces[0] },
        { id: 72, label: 'Second fixture map', user_namespace: namespaces[1] },
      ];
      const reads: Array<{ kind: string; params: Array<[string, string]> }> = [];
      const writes: string[] = [];
      page.on('request', (r) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method()))
          writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET webui_user_settings': () => ({ webui_user_settings: [] }),
          'GET user_namespaces': ({ searchParams }) => {
            reads.push({ kind: 'namespace', params: Array.from(searchParams.entries()) });
            const size = searchParams.get('user_namespace[size]');
            return { user_namespaces: namespaces.filter((n) => !size || String(n.size) === size) };
          },
          'GET user_namespaces/21': () => {
            user_namespace: namespaces[0];
          },
          'GET user_namespace_maps/71': () => ({ user_namespace_map: maps[0] }),
          'GET user_namespace_maps/71/entries': () => ({ entries: [] }),
          'GET vpses': () => ({ vpses: [] }),
          'GET user_namespace_maps': ({ searchParams }) => {
            reads.push({ kind: 'map', params: Array.from(searchParams.entries()) });
            const id = searchParams.get('user_namespace_map[user_namespace]');
            return { user_namespace_maps: maps.filter((m) => !id || String(m.user_namespace?.id) === id) };
          },
        },
      });
      const base = role === 'member' ? '/app/profile/user-namespaces' : '/admin/user-namespaces';
      const prefix = role === 'member' ? 'profile.userns' : 'admin.userns';
      await page.goto(withAppUrl(base + '/namespaces'));
      await expect(page.getByTestId(prefix + '.namespaces.row.22')).toBeVisible();
      const input = page.getByTestId(prefix + '.namespaces.search.input');
      await expect(input).toHaveAttribute('placeholder', language === 'cs' ? 'ID nebo filtr…' : 'ID or filter…');
      const help = page.getByTestId(prefix + '.namespaces.smart.help_button');
      await expect(help).toHaveText(language === 'cs' ? 'Nápověda' : 'Help');
      await help.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId(prefix + '.namespaces.smart.help')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(help).toBeFocused();
      await input.fill('size:65536');
      await input.press('Enter');
      await expect(page.getByTestId(prefix + '.namespaces.row.22')).toHaveCount(0);
      await expect(page).toHaveURL(/size=65536/);
      for (const suffix of [
        'search.input',
        'smart.help_button',
        'filters.advanced',
        'filters.copy_link',
        'filters.clear',
      ]) {
        const control = page.getByTestId(prefix + '.namespaces.' + suffix);
        const rect = await control.boundingBox();
        expect(rect?.height).toBe(44);
      }
      await page.getByTestId(prefix + '.namespaces.filters.clear').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId(prefix + '.namespaces.row.22')).toBeVisible();
      await expect(page).not.toHaveURL(/size=/);
      await page.getByTestId(prefix + '.namespaces.row.21').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId(prefix + '.namespace.title')).toBeVisible();
      await expect(page.getByTestId(prefix + '.namespace.subtitle')).toHaveCount(0);
      const mapLink = page.locator(`a[href="${base}/maps?user_namespace=21"]`);
      await expect(mapLink).toBeVisible();
      await mapLink.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId(prefix + '.maps.row.71')).toBeVisible();
      await expect(page.getByTestId(prefix + '.maps.row.72')).toHaveCount(0);
      const row = page.getByTestId(prefix + '.maps.row.71');
      const open = row.getByRole('link', { name: language === 'cs' ? 'Otevřít' : 'Open', exact: true });
      await expect(open).toHaveAttribute('href', base + '/maps/71');
      const remove = page.getByTestId(prefix + '.maps.row.71.delete');
      if (hasTouch) {
        await expectTouchSize(open);
        await expectTouchSize(remove);
      }
      await remove.scrollIntoViewIfNeeded();
      await expectReadableButton(remove);
      if (!hasTouch) {
        await remove.hover();
        await expectReadableButton(remove);
      }
      await remove.focus();
      await page.keyboard.press('Enter');
      const confirm = page.getByTestId(prefix + '.maps.delete.confirm');
      await expect(confirm).toBeVisible();
      await expect(page).toHaveURL(/maps\?user_namespace=21/);
      await page.keyboard.press('Escape');
      await expect(confirm).toHaveCount(0);
      await page.getByTestId(prefix + '.maps.filters.clear').click();
      await expect(page.getByTestId(prefix + '.maps.row.72')).toBeVisible();
      const mapInput = page.getByTestId(prefix + '.maps.search.input');
      await mapInput.fill('namespace:21');
      await mapInput.press('Enter');
      await expect(page.getByTestId(prefix + '.maps.row.72')).toHaveCount(0);
      await page.getByTestId(prefix + '.maps.filters.clear').click();
      await expect(page.getByTestId(prefix + '.maps.row.72')).toBeVisible();
      await page.getByTestId(prefix + '.maps.create').click();
      const drawer = page.getByTestId(prefix + '.maps.create.drawer');
      const cancel = drawer.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true });
      const create = page.getByTestId(prefix + '.maps.create.submit');
      const cancelBox = await cancel.boundingBox(),
        createBox = await create.boundingBox();
      expect(cancelBox).not.toBeNull();
      expect(createBox).not.toBeNull();
      expect(cancelBox?.y).toBe(createBox?.y);
      expect(cancelBox?.x).toBeLessThan(createBox?.x ?? 0);
      const content = await drawer.boundingBox();
      expect((createBox?.x ?? 0) + (createBox?.width ?? 0)).toBeLessThanOrEqual(
        (content?.x ?? 0) + (content?.width ?? 0)
      );
      expect(
        (content?.x ?? 0) + (content?.width ?? 0) - ((createBox?.x ?? 0) + (createBox?.width ?? 0))
      ).toBeLessThanOrEqual(20);
      await cancel.focus();
      await page.keyboard.press('Tab');
      await expect(create).toBeFocused();
      await cancel.click();
      await expect(drawer).toHaveCount(0);
      await open.scrollIntoViewIfNeeded();
      await open.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(base + '/maps/71$'));
      await expect(page.getByTestId(prefix + '.map.rename.input')).toHaveValue('First fixture map');
      for (const read of reads) {
        const params = new URLSearchParams(read.params);
        expect(params.get(read.kind === 'map' ? 'user_namespace_map[q]' : 'user_namespace[q]')).toBeNull();
        expect(params.get(read.kind === 'map' ? 'user_namespace_map[user]' : 'user_namespace[user]')).toBeNull();
      }
      expect(reads.some((r) => new URLSearchParams(r.params).get('user_namespace[size]') === '65536')).toBe(true);
      expect(reads.some((r) => new URLSearchParams(r.params).get('user_namespace_map[user_namespace]') === '21')).toBe(
        true
      );
      expect(writes).toEqual([]);
      await expectNoDocumentHorizontalOverflow(page);
    });
  }
}

test('@pr-smoke @pr-smoke-mobile namespace create retains its exact payload and pending duplicate guard', async ({
  page,
}) => {
  const namespaces = [
    { id: 21, size: 65536 },
    { id: 22, size: 131072 },
  ];
  const map = { id: 71, label: 'New fixture map', user_namespace: namespaces[1] };
  const payloads: unknown[] = [];
  let release: () => void = () => {
    throw Error('Pending request not started');
  };
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await installHaveApiMock(page, {
    user: { id: 7, login: 'namespace-create-fixture', level: 1 },
    handlers: {
      'GET webui_user_settings': () => ({ webui_user_settings: [] }),
      'GET user_namespaces': () => ({ user_namespaces: namespaces }),
      'GET user_namespace_maps': () => ({ user_namespace_maps: [] }),
      'POST user_namespace_maps': async ({ request }) => {
        payloads.push(await request.postDataJSON());
        await pending;
        return { user_namespace_map: map };
      },
      'GET user_namespace_maps/71': () => ({ user_namespace_map: map }),
      'GET user_namespace_maps/71/entries': () => ({ entries: [] }),
      'GET vpses': () => ({ vpses: [] }),
    },
  });
  try {
    await page.goto(withAppUrl('/app/profile/user-namespaces/maps'));
    await page.getByTestId('profile.userns.maps.create').click();
    await page.getByTestId('profile.userns.maps.create.label').fill('  New fixture map  ');
    await page.getByTestId('profile.userns.maps.create.namespace').selectOption('22');
    const submit = page.getByTestId('profile.userns.maps.create.submit');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect.poll(() => payloads.length).toBe(1);
    expect(payloads).toEqual([{ user_namespace_map: { user_namespace: 22, label: 'New fixture map' } }]);
    await page.keyboard.press('Enter');
    expect(payloads).toHaveLength(1);
    release();
    await expect(page).toHaveURL(/\/app\/profile\/user-namespaces\/maps\/71$/);
    await expect(page.getByTestId('profile.userns.map.rename.input')).toHaveValue('New fixture map');
    expect(payloads).toHaveLength(1);
  } finally {
    release();
  }
});
