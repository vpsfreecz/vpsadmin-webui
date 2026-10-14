import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage, failEnvelope, jsonFulfill } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  test.describe(`Bilingual news (${language})`, () => {
    test.use({ locale: language === 'cs' ? 'cs-CZ' : 'en-US' });
    test('@pr-smoke @pr-smoke-mobile creates and edits independent translations', async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      let record = { id: 42, cs_message: '', en_message: '', published_at: '2026-07-12T18:00:00.000Z' };
      let created = false;
      let createPayload: unknown;
      let updatePayload: unknown;
      let rejectSave = false;
      const mock = await installHaveApiMock(page, {
        user: { id: 1, login: 'admin', level: 100 },
        handlers: {
          'GET news_logs': () => ({ news_logs: created ? [{ ...record, message: record.cs_message || record.en_message }] : [] }),
          'POST news_logs': ({ request }) => {
            createPayload = request.postDataJSON();
            record = { ...record, ...(createPayload as { news_log: typeof record }).news_log };
            created = true;
            return { news_log: record };
          },
          'PUT news_logs/42': ({ request }) => {
            updatePayload = request.postDataJSON();
            if (rejectSave) return jsonFulfill(failEnvelope('Synthetic save failure'), 503);
            record = { ...record, ...(updatePayload as { news_log: typeof record }).news_log };
            return { news_log: record };
          },
        },
      });
      await page.goto('/admin/content/news');
      await page.getByTestId('admin.newslog.create').click();
      const cs = page.getByTestId('admin.newslog.editor.cs_message');
      const en = page.getByTestId('admin.newslog.editor.en_message');
      const save = page.getByTestId('admin.newslog.editor.save');
      const editor = page.getByTestId('admin.newslog.editor');
      await expect(cs).toHaveAccessibleName(language === 'cs' ? 'Zpráva (česky)' : 'Message (Czech)');
      await expect(en).toHaveAccessibleName(language === 'cs' ? 'Zpráva (anglicky)' : 'Message (English)');
      await expect(save).toBeDisabled();
      const nowBox = await page.getByTestId('admin.newslog.editor.set_now').boundingBox();
      expect(nowBox).not.toBeNull();
      expect(nowBox!.x + nowBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      const czech = 'Plánovaná údržba. <a href="https://example.test/notice">Podrobnosti</a>';
      const english = 'Scheduled maintenance. <a href="https://example.test/notice">Details</a>';
      await cs.fill(czech);
      await expect(save).toBeDisabled();
      await en.fill(english);
      await expect(save).toBeEnabled();
      await save.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      await page.screenshot({ path: testInfo.outputPath(`news-editor-${language}.png`), fullPage: true, scale: 'css' });
      await save.click();
      await expect(editor).toBeHidden();
      expect(createPayload).toEqual({ news_log: { cs_message: czech, en_message: english, published_at: expect.any(String) } });

      const edit = page.getByTestId('admin.newslog.edit.42').or(page.getByTestId('admin.newslog.card.42.edit')).filter({ visible: true });
      const row = page.getByTestId('admin.newslog.table').or(page.getByTestId('admin.newslog.card.42')).filter({ visible: true });
      await expect(row).toContainText(language === 'cs' ? 'Plánovaná údržba.' : 'Scheduled maintenance.');
      await edit.click();
      await expect(cs).toHaveValue(czech);
      await expect(en).toHaveValue(english);
      await cs.fill('Upravená česká zpráva');
      rejectSave = true;
      await save.click();
      await expect(page.getByTestId('admin.newslog.editor.error').getByText('Synthetic save failure')).toBeVisible();
      await expect(cs).toHaveValue('Upravená česká zpráva');
      await expect(en).toHaveValue(english);
      rejectSave = false;
      await save.click();
      await expect(editor).toBeHidden();
      expect(updatePayload).toEqual({ news_log: { cs_message: 'Upravená česká zpráva', en_message: english, published_at: expect.any(String) } });
      await edit.click();
      await expect(cs).toHaveValue('Upravená česká zpráva');
      await expect(en).toHaveValue(english);
      await cs.fill('');
      await save.click();
      await expect(editor).toBeHidden();
      expect(updatePayload).toEqual({ news_log: { cs_message: '', en_message: english, published_at: expect.any(String) } });
      await expect(row).toContainText('Scheduled maintenance.');
      await edit.click();
      await expect(cs).toHaveValue('');
      await expect(en).toHaveValue(english);
      await page.keyboard.press('Escape');
      // A localized read-only message must never masquerade as English input.
      mock.addHandler('GET news_logs', () => ({ news_logs: [{ id: 42, message: 'Pouze lokalizovaný text', published_at: record.published_at }] }));
      await page.reload();
      await edit.click();
      await expect(cs).toHaveValue('');
      await expect(en).toHaveValue('');
      await expect(save).toBeDisabled();
    });
  });
}

test.describe('Admin news', () => {
  test('@pr-smoke-mobile @smoke-mobile keeps news actions directly reachable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET news_logs': () => ({
          news_logs: [{
            id: 7,
            message: 'Planned maintenance affecting several clusters and customer services',
            published_at: '2030-07-12T18:00:00.000Z',
          }],
        }),
      },
    });

    await page.goto('/admin/content/news');

    const card = page.getByTestId('admin.newslog.card.7');
    const edit = page.getByTestId('admin.newslog.card.7.edit');
    const remove = page.getByTestId('admin.newslog.card.7.delete');
    await expect(card).toBeVisible();
    await expect(page.getByTestId('admin.newslog.table')).toBeHidden();
    await expect(card.getByText('Planned maintenance affecting several clusters and customer services', { exact: true })).toBeVisible();
    await expect(card.getByText('#7', { exact: true })).toBeVisible();
    await expect(card.getByText('Scheduled', { exact: true })).toBeVisible();

    const documentOverflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(documentOverflows).toBe(false);
    await expect.poll(() => card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

    const viewportWidth = page.viewportSize()?.width ?? 0;
    for (const action of [edit, remove]) {
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await edit.click();
    await expect(page.getByTestId('admin.newslog.editor')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('admin.newslog.editor')).toBeHidden();

    await remove.click();
    const confirmation = page.getByTestId('admin.newslog.delete_confirm');
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByTestId('admin.newslog.delete_confirm.confirm')).toBeVisible();
  });
});
