import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test.use({ timezoneId: 'Europe/Prague' });

const copy = {
  cs: {
    deadline: 'Platnost stavu do', unlimited: 'Bez lhůty', unknown: 'Neznámé', duration: 'Doba platnosti stavu', date: 'Datum a čas ukončení platnosti',
    help: 'Do tohoto času nejdéle platí potvrzení nebo ignorování. Po uplynutí se stav aktualizuje při další kontrole.',
    ack: 'Potvrzením označíš, že o události víš. Opakovaná upozornění na trvající problém se zastaví. Výsledky kontrol se dál ukládají a úspěšná kontrola událost uzavře.',
    ignore: 'Po dobu ignorování se výsledky dalších kontrol pro tuto událost neukládají a její stav se podle nich nemění. Opakovaná upozornění jsou vypnuta. Po odeznění problému se ignorovaná událost sama neuzavře.',
    finite: 'Lhůta stavu:', indefinite: 'Platnost není časově omezena.', invalid: 'Neplatné datum/čas', confirmed: 'Problém potvrzen', acknowledged: 'Oznámení potvrzeno',
  },
  en: {
    deadline: 'State deadline', unlimited: 'No time limit', unknown: 'Unknown', duration: 'State duration', date: 'State deadline date and time',
    help: 'Acknowledgement or ignore state applies up to this time. Once it expires, the next check updates the state.',
    ack: 'Acknowledging records that you are aware of this event and stops repeated alerts about the ongoing problem. Check results are still recorded, and a successful check closes the event.',
    ignore: 'While ignored, further check results are not recorded for this event and do not update its state. Repeated alerts are disabled. An ignored event does not close automatically when the problem ends.',
    finite: 'State deadline:', indefinite: 'No time limit applies.', invalid: 'Invalid date/time', confirmed: 'Problem confirmed', acknowledged: 'Acknowledged',
  },
} as const;

for (const language of ['cs', 'en'] as const) for (const admin of [false, true]) {
  test(`@pr-smoke @pr-smoke-mobile monitoring state deadlines are explained ${language} admin=${admin}`, async ({ page, hasTouch }) => {
    await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_MONITORING_MEANING', webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const common = { label: 'Synthetic event', monitor: 'fixture', created_at: '2026-11-14T12:00:00Z', updated_at: '2026-11-14T12:02:00Z', duration: 120 };
    const events = [
      { ...common, id: 201, state: 'confirmed', saved_until: null },
      { ...common, id: 202, state: 'acknowledged', saved_until: '2026-12-20T12:30:00Z' },
      { ...common, id: 203, state: 'acknowledged', saved_until: null },
      { ...common, id: 204, state: 'ignored', saved_until: null },
      { ...common, id: 205, state: 'ignored' },
    ];
    const writes: string[] = [];
    page.on('request', r => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method()); });
    await installHaveApiMock(page, { user: { id: 1, login: 'fixture', level: admin ? 99 : 1 }, handlers: {
      'GET monitored_events': () => ({ monitored_events: events }),
      'GET monitored_events/204': () => ({ monitored_event: events[3] }),
      'GET monitored_events/204/logs': () => ({ logs: [] }),
      'GET monitored_events/205': () => ({ monitored_event: events[4] }),
      'GET monitored_events/205/logs': () => ({ logs: [] }),
    } });
    const base = (admin ? '/admin' : '/app') + '/monitoring';
    const c = copy[language];
    await page.goto(base);
    await expect(page.getByTestId('monitoring.events.expiry_help')).toHaveText(c.help);
    await expect(page.getByRole('columnheader', { name: c.deadline, exact: true })).toBeVisible();
    await expect(page.getByTestId('monitoring.events.row.201.state')).toHaveText(c.confirmed);
    await expect(page.getByTestId('monitoring.events.row.202.state')).toHaveText(c.acknowledged);
    await expect(page.getByTestId('monitoring.events.row.201').locator('td').last()).toHaveText('—');
    await expect(page.getByTestId('monitoring.events.row.202').locator('td').last()).not.toHaveText(c.unlimited);
    await expect(page.getByTestId('monitoring.events.row.202').locator('td').last()).toContainText('2026');
    for (const id of [203, 204]) await expect(page.getByTestId(`monitoring.events.row.${id}`).locator('td').last()).toHaveText(c.unlimited);
    await expect(page.getByTestId('monitoring.events.row.205').locator('td').last()).toHaveText(c.unknown);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.goto(base + '/204');
    const summary = page.getByTestId('monitoring.event.summary');
    await expect(page.getByTestId('monitoring.event.expiry_help')).toHaveText(c.help);
    await expect(summary).toContainText(c.deadline); await expect(summary).toContainText(c.unlimited);
    await page.goto(base + '/205');
    await expect(page.getByTestId('monitoring.event.summary')).toContainText(c.unknown);
    expect(writes).toEqual([]);
  });

  test(`@pr-smoke @pr-smoke-mobile monitoring decision meaning preserves payload and pending gates ${language} admin=${admin}`, async ({ page, hasTouch }) => {
    await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_MONITORING_DECISIONS', webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const requests: Array<{ kind: string; body: unknown }> = [];
    let complete: (() => void) | undefined;
    await installHaveApiMock(page, { user: { id: 1, login: 'fixture', level: admin ? 99 : 1 }, handlers: {
      'GET monitored_events/201': () => ({ monitored_event: { id: 201, label: 'Synthetic event', state: 'confirmed' } }),
      'GET monitored_events/201/logs': () => ({ logs: [] }),
      'POST monitored_events/201/acknowledge': async ({ request }) => {
        requests.push({ kind: 'ack', body: request.postDataJSON() });
        await new Promise<void>(resolve => { complete = resolve; });
        return { monitored_event: {} };
      },
      'POST monitored_events/201/ignore': async ({ request }) => {
        requests.push({ kind: 'ignore', body: request.postDataJSON() });
        await new Promise<void>(resolve => { complete = resolve; });
        return { monitored_event: {} };
      },
    } });
    const base = (admin ? '/admin' : '/app') + '/monitoring', c = copy[language];
    await page.goto(base + '/201');
    for (const kind of ['ack', 'ignore'] as const) for (const preset of ['custom', 'forever'] as const) {
      await page.getByTestId(`monitoring.event.${kind}.open`).click();
      const dialog = page.getByTestId(`monitoring.event.${kind}`);
      await expect(dialog).toContainText(c[kind]);
      const duration = dialog.getByRole('combobox', { name: c.duration, exact: true });
      await expect(duration).toHaveAccessibleName(c.duration);
      await duration.selectOption(preset);
      if (preset === 'custom') {
        const date = dialog.getByLabel(c.date, { exact: true });
        await date.fill(''); await expect(dialog.getByText(c.invalid, { exact: true })).toBeVisible();
        await expect(page.getByTestId(`monitoring.event.${kind}.confirm`)).toBeDisabled();
        await expect(dialog.getByText(c.indefinite, { exact: true })).toHaveCount(0);
        await date.fill('2026-12-20T13:30'); await expect(dialog).toContainText(c.finite);
      } else await expect(dialog.getByText(c.indefinite, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      try {
        const confirm = page.getByTestId(`monitoring.event.${kind}.confirm`), before = requests.length;
        await confirm.focus(); await page.keyboard.press('Enter');
        await expect.poll(() => requests.length).toBe(before + 1); await expect(confirm).toBeDisabled();
        await page.keyboard.press('Enter'); expect(requests.length).toBe(before + 1);
        expect(requests[before]).toEqual({ kind, body: { monitored_event: preset === 'custom' ? { until: '2026-12-20T12:30:00.000Z' } : {} } });
        if (!complete) throw Error('Missing intercepted pending request');
      } finally {
        complete?.(); complete = undefined;
      }
      await expect(dialog).toHaveCount(0);
    }
    expect(requests.map(r => r.kind)).toEqual(['ack', 'ack', 'ignore', 'ignore']);
    await page.getByTestId('monitoring.event.ack.open').click();
    await page.getByTestId('monitoring.event.ack.cancel').click();
    expect(requests).toHaveLength(4);
  });
}
