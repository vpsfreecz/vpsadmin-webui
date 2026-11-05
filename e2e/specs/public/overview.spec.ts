import { expect, test, type Page, type Request } from '@playwright/test';
import type { Outage__ShowOutput, OutageUpdate__ShowOutput } from 'vpsadmin-typescript-client';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

/**
 * Public status landing smoke.
 *
 * This spec is part of the PR smoke suite.
 * Keep it fast and deterministic.
 */
test('@pr-smoke @pr-smoke-mobile @smoke @smoke-mobile public overview shows key status surfaces', async ({ page }) => {
  const publicRequests: Request[] = [];
  page.on('request', (request) => {
    if (/\/(cluster\/public_stats|nodes\/public_status)$/.test(new URL(request.url()).pathname)) {
      publicRequests.push(request);
    }
  });
  await setUiSettingsLocalStorage(page, { theme: 'dark', language: 'en' });
  await bootstrapVpsAdminWindow(page, {
    apiUrl: '/api',
    apiVersion: '7.0',
    sessionToken: 'TEST',
  });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET cluster/public_stats': () => ({
        cluster: { user_count: 123, vps_count: 456, ipv4_left: 200 },
      }),
      'GET nodes/public_status': () => ({
        nodes: [
          {
            name: 'node-prg',
            status: true,
            location: { label: 'Praha' },
            last_report: '2025-01-01T00:00:00Z',
            vps_count: 100,
            vps_free: 10,
            cpu_idle: 50,
          },
          {
            name: 'node-brq',
            status: true,
            location: { label: 'Brno' },
            last_report: '2025-01-01T00:00:00Z',
            vps_count: 120,
            vps_free: 5,
            cpu_idle: 60,
          },
        ],
      }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
      'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401),
    },
  });

  await page.goto('/');

  // Page shell
  await expect(page.getByTestId('public.overview.page')).toBeVisible();
  await expect(page.getByTestId('public.summary-grid')).toBeVisible();

  // Primary stats
  await expect(page.getByTestId('public.stats.members')).toBeVisible();
  await expect(page.getByTestId('public.stats.nodes')).toBeVisible();
  await expect(page.getByTestId('public.stats.vps')).toBeVisible();
  expect(publicRequests.length).toBeGreaterThanOrEqual(2);
  for (const request of publicRequests) {
    expect(request.resourceType()).toBe('xhr');
    expect(request.headers()['x-haveapi-auth-token']).toBeUndefined();
    expect(request.headers()['x-haveapi-oauth2-token']).toBeUndefined();
    expect(request.headers()['authorization']).toBeUndefined();
    // Browser defaults may send Accept-Language; the package must not override it.
    expect(request.headers()['accept']).toBe('application/json');
  }

  // Supporting sections. Empty outages are intentionally hidden.
  await expect(page.locator('[data-testid="public.outages.card"]')).toHaveCount(0);
  await expect(page.getByTestId('public.nodes.section')).toBeVisible();

  const nodesSection = page.getByTestId('public.nodes.section');
  const visibleLocationPanels = nodesSection.locator(
    '[data-cluster-location][data-cluster-location-layout="panel"]:visible'
  );
  const prahaPanel = nodesSection.locator(
    '[data-cluster-location="Praha"][data-cluster-location-layout="panel"]:visible'
  );
  const brnoPanel = nodesSection.locator(
    '[data-cluster-location="Brno"][data-cluster-location-layout="panel"]:visible'
  );

  await expect(visibleLocationPanels).toHaveCount(2);
  await expect(prahaPanel).toBeVisible();
  await expect(brnoPanel).toBeVisible();
  await expect(prahaPanel).toContainText('node-prg');
  await expect(prahaPanel).not.toContainText('node-brq');
  await expect(brnoPanel).toContainText('node-brq');
  await expect(brnoPanel).not.toContainText('node-prg');

  for (const panel of [prahaPanel, brnoPanel]) {
    const summary = panel.locator('[data-testid$=".summary"]');
    await expect
      .poll(() =>
        summary.evaluate((badge) => {
          const badgeRect = badge.getBoundingClientRect();
          const panelRect = badge.closest('[data-cluster-location]')?.getBoundingClientRect();
          return Boolean(panelRect && badgeRect.left >= panelRect.left && badgeRect.right <= panelRect.right + 1);
        })
      )
      .toBe(true);
  }

  const prahaSummary = prahaPanel.locator('summary');
  const borderColors = await prahaPanel.evaluate((panel) => {
    const style = getComputedStyle(panel);
    const root = getComputedStyle(document.documentElement);
    return {
      actual: style.borderTopColor,
      neutral: `rgb(${root.getPropertyValue('--c-border').trim().replaceAll(' ', ', ')})`,
      info: `rgb(${root.getPropertyValue('--c-info-border').trim().replaceAll(' ', ', ')})`,
    };
  });
  expect(borderColors.actual).toBe(borderColors.neutral);
  expect(borderColors.actual).not.toBe(borderColors.info);

  await prahaSummary.getByText('Praha', { exact: true }).click();
  await expect(prahaPanel).not.toHaveAttribute('open', '');
  await expect
    .poll(() =>
      prahaSummary.evaluate((summary) => ({
        focused: document.activeElement === summary,
        focusVisible: summary.matches(':focus-visible'),
        boxShadow: getComputedStyle(summary).boxShadow,
      }))
    )
    .toEqual({ focused: true, focusVisible: false, boxShadow: 'none' });

  await prahaSummary.click({ position: { x: 8, y: 8 } });
  await expect(prahaPanel).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      prahaSummary.evaluate((summary) => ({
        focused: document.activeElement === summary,
        focusVisible: summary.matches(':focus-visible'),
        boxShadow: getComputedStyle(summary).boxShadow,
      }))
    )
    .toEqual({ focused: true, focusVisible: false, boxShadow: 'none' });

  await page.locator('body').click({ position: { x: 4, y: 4 } });
  let keyboardReachedSummary = false;
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    keyboardReachedSummary = await prahaSummary.evaluate((summary) => document.activeElement === summary);
    if (keyboardReachedSummary) break;
  }
  expect(keyboardReachedSummary).toBe(true);
  await expect
    .poll(() =>
      prahaSummary.evaluate((summary) => ({
        focusVisible: summary.matches(':focus-visible'),
        boxShadow: getComputedStyle(summary).boxShadow,
      }))
    )
    .toEqual({
      focusVisible: true,
      boxShadow: expect.not.stringMatching(/^none$/),
    });

  const clusterProofScreenshot = process.env['E2E_CLUSTER_PUBLIC_PROOF_SCREENSHOT']?.trim();
  if (clusterProofScreenshot) {
    await page.screenshot({ path: clusterProofScreenshot, fullPage: true });
  }

  // Not shown when IPv4 is healthy.
  await expect(page.locator('[data-testid="public.ipv4.alert"]')).toHaveCount(0);
});

test('public overview shows IPv4 critical alert when low', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, {
    apiUrl: '/api',
    apiVersion: '7.0',
    sessionToken: 'TEST',
    webuiNext: { publicStatus: { ipv4Warn: 64, ipv4Critical: 16 } },
  });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET cluster/public_stats': () => ({
        cluster: { user_count: 1, vps_count: 1, ipv4_left: 10 },
      }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
      'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401),
    },
  });

  await page.goto('/');

  await expect(page.getByTestId('public.overview.page')).toBeVisible();
  await expect(page.getByTestId('public.ipv4.alert')).toBeVisible();
  await expect(page.getByTestId('public.ipv4.alert')).toContainText('10');
});

test('public overview retains unknown-only outage', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  const unknownOutage = {
    id: 74,
    en_summary: 'Timing not yet known',
    cs_summary: 'Čas zatím není znám',
  } satisfies Outage__ShowOutput;
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (/\/(cluster\/public_stats|nodes\/public_status|outages|news_logs)$/.test(new URL(request.url()).pathname))
      requests.push(request);
  });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  await bootstrapVpsAdminWindow(page, { sessionToken: '' });
  await installHaveApiMock(page, {
    handlers: {
      'GET cluster/public_stats': () => ({ cluster: { user_count: 123, vps_count: 456, ipv4_left: 200 } }),
      'GET nodes/public_status': () => ({
        nodes: [{ name: 'node-prg', status: true, location: { label: 'Praha' }, vps_count: 100, vps_free: 10 }],
      }),
      'GET outages': ({ searchParams }) => {
        expect(searchParams.get('outage[limit]')).toBe('25');
        return { outages: [unknownOutage] };
      },
      'GET outages/74/entities': () => ({
        entities: [{ id: 1, name: 'Node', entity_id: 8, label: 'node-public.test' }],
      }),
      'GET news_logs': () => ({
        news_logs: [{ id: 91, published_at: '2026-01-01T10:00:00Z', message: '<p>Public status fixture news</p>' }],
      }),
      'GET help_boxes': () => ({ help_boxes: [] }),
      'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401),
    },
  });
  const outageResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname.endsWith('/outages') && response.request().method() === 'GET'
  );
  await page.goto('/');
  const response = await outageResponse;
  expect(response.status()).toBe(200);
  const wire: unknown = await response.json();
  expect(wire).toMatchObject({ status: true, response: { outages: [unknownOutage] } });
  await expect(page.getByTestId('public.overview.page')).toBeVisible();
  await expect(page.getByTestId('public.stats.members')).toContainText('123');
  await expect(page.getByTestId('public.nodes.section')).toContainText('node-prg');
  await expect(page.getByTestId('public.news.card')).toContainText('Public status fixture news');
  await expect(
    page.getByText(language === 'cs' ? 'Načítám výpadky…' : 'Loading outages…', { exact: true })
  ).toBeHidden();
  for (const request of requests) {
    expect(request.resourceType()).toBe('xhr');
    expect(request.headers()['x-haveapi-auth-token']).toBeUndefined();
    expect(request.headers()['x-haveapi-oauth2-token']).toBeUndefined();
    expect(request.headers()['authorization']).toBeUndefined();
  }
  await expect(page.getByText(language === 'cs' ? 'Probíhá výpadek' : 'Ongoing outage', { exact: true })).toHaveCount(
    0
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('overview-unknown-only.png'), fullPage: true, scale: 'css' });
  await testInfo.attach('unknown-only-public-response', {
    body: JSON.stringify(wire),
    contentType: 'application/json',
  });
  // Keep the same desired-state assertions for the failing baseline and candidate.
  const card = page.getByTestId('public.outages.card');
  await expect.soft(card).toBeVisible({ timeout: 1000 });
  await expect
    .soft(
      card.getByRole('link', {
        name: language === 'cs' ? unknownOutage.cs_summary : unknownOutage.en_summary,
        exact: true,
      })
    )
    .toHaveAttribute('href', '/outages/74', { timeout: 1000 });
});

// Public list/detail evidence uses the same intercepted API as the overview.
const contentOutage = {
  id: 71,
  state: 'announced',
  type: 'planned_outage',
  impact: 'outage',
  begins_at: '2026-01-01T10:00:00Z',
  duration: 30,
  en_summary: 'Storage maintenance',
  cs_summary: 'Odstávka úložiště',
  en_description: 'Storage access is interrupted while the replacement completes.',
  cs_description: 'Přístup k úložišti je během výměny přerušen.',
};
const contentAdvisory = {
  id: 77,
  name: 'VPSA-2026-77',
  state: 'published',
  published_at: '2026-01-02T10:00:00Z',
  affected: true,
  en_summary: 'Kernel update required',
  cs_summary: 'Nutná aktualizace jádra',
  en_description: 'A kernel vulnerability affects the listed nodes.',
  cs_description: 'Chyba jádra se týká uvedených nodů.',
  en_response: 'Install the corrected kernel and restart the affected VPS.',
  cs_response: 'Nainstaluj opravené jádro a restartuj dotčené VPS.',
};

async function installPublicContentMock(page: Page, state: 'populated' | 'empty' | 'error', level?: number) {
  const failure = () => jsonFulfill(failEnvelope('Unavailable'), 503);
  const advisories = [contentAdvisory, { ...contentAdvisory, id: 78, name: 'VPSA-2026-78', state: 'retracted' }];
  await bootstrapVpsAdminWindow(page, level === undefined ? {} : { sessionToken: 'PUBLIC_CONTENT_FIXTURE' });
  await installHaveApiMock(page, {
    user: level === undefined ? undefined : { id: 10, login: 'public-review', level },
    handlers: {
      ...(level === undefined ? { 'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401) } : {}),
      'GET outages': () =>
        state === 'error'
          ? failure()
          : {
              outages:
                state === 'empty'
                  ? []
                  : [
                      contentOutage,
                      {
                        ...contentOutage,
                        id: 72,
                        begins_at: '2099-01-01T10:00:00Z',
                        en_summary: 'Future maintenance',
                        cs_summary: 'Budoucí odstávka',
                      },
                      {
                        ...contentOutage,
                        id: 73,
                        state: 'resolved',
                        finished_at: '2026-01-01T10:30:00Z',
                        en_summary: 'Completed maintenance',
                        cs_summary: 'Dokončená odstávka',
                      },
                      { id: 74, en_summary: 'Timing not yet known', cs_summary: 'Čas zatím není znám' },
                    ],
            },
      'GET outages/71': () => ({ outage: contentOutage }),
      'GET outages/71/entities': () => ({
        entities: [{ id: 1, name: 'Node', entity_id: 8, label: 'node-public.test' }],
      }),
      'GET outages/71/handlers': () => ({
        handlers: [{ id: 1, full_name: 'Fixture operator', note: 'Storage replacement' }],
      }),
      'GET outage_updates': () => ({
        outage_updates: [
          {
            id: 1,
            created_at: '2026-01-01T10:15:00Z',
            en_description: 'Replacement in progress',
            cs_description: 'Probíhá výměna',
          } satisfies OutageUpdate__ShowOutput,
        ],
      }),
      'GET security_advisories': ({ searchParams }) =>
        state === 'error'
          ? failure()
          : {
              security_advisories:
                state === 'empty'
                  ? []
                  : advisories.filter((row) => row.state === searchParams.get('security_advisory[state]')),
            },
      'GET security_advisories/77': () => ({ security_advisory: contentAdvisory }),
      'GET security_advisory_cves': () => ({ security_advisory_cves: [{ id: 1, cve_id: 'CVE-2026-12345' }] }),
      'GET security_advisories/77/node_statuses': () => ({
        node_statuses: [{ id: 1, state: 'vulnerable', node: { id: 8, name: 'node-public.test' } }],
      }),
      'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
      'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
      'GET vps_security_advisories': ({ searchParams }) => {
        if (level !== undefined && level >= 90) expect(searchParams.get('vps_security_advisory[user]')).toBe('10');
        return {
          vps_security_advisories: [
            {
              id: 1,
              vps: { id: 123, hostname: 'owned-vps.test' },
              node: { id: 8, name: 'node-public.test' },
              node_state: 'vulnerable',
            },
          ],
        };
      },
    },
  });
}

for (const language of ['cs', 'en'] as const) {
  test(`public outage/advisory content ${language}`, async ({ page }, testInfo) => {
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await installPublicContentMock(page, 'populated');
    await page.goto('/outages');
    const outages = page.getByTestId('public.outages.page');
    for (const id of [71, 72, 73, 74]) await expect(outages.locator(`a[href="/outages/${id}"]`)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('outages.png'), fullPage: true, scale: 'css' });
    await outages.locator('a[href="/outages/71"]').click();
    const outage = page.getByTestId('public.outage_detail.page');
    await expect(outage).toContainText(language === 'cs' ? contentOutage.cs_description : contentOutage.en_description);
    await expect(outage).toContainText('Fixture operator');
    await expect(outage).toContainText('node-public.test');
    await expect(outage).toContainText(language === 'cs' ? 'Probíhá výměna' : 'Replacement in progress');
    await page.screenshot({ path: testInfo.outputPath('outage-detail.png'), fullPage: true, scale: 'css' });
    await page.goto('/security-advisories');
    const advisories = page.getByTestId('public.security_advisories.page');
    await expect(advisories).toContainText('VPSA-2026-77');
    await expect(advisories).toContainText('VPSA-2026-78');
    await expect(advisories).toContainText('CVE-2026-12345');
    await page.screenshot({ path: testInfo.outputPath('advisories.png'), fullPage: true, scale: 'css' });
    await advisories.getByRole('link', { name: 'VPSA-2026-77', exact: true }).click();
    const advisory = page.getByTestId('public.security_advisory_detail.page');
    await expect(advisory).toContainText(language === 'cs' ? contentAdvisory.cs_response : contentAdvisory.en_response);
    await expect(advisory).toContainText('CVE-2026-12345');
    await expect(advisory).toContainText('node-public.test');
    await expect(advisory.getByRole('link', { name: 'owned-vps.test' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('advisory-detail.png'), fullPage: true, scale: 'css' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  for (const state of ['empty', 'error'] as const) {
    test(`public status list states ${state} ${language}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await installPublicContentMock(page, state);
      for (const [path, message] of [
        [
          '/outages',
          state === 'empty'
            ? language === 'cs'
              ? 'Žádné výpadky'
              : 'No outages'
            : language === 'cs'
              ? 'Nepodařilo se načíst výpadky'
              : 'Failed to load outages',
        ],
        [
          '/security-advisories',
          state === 'empty'
            ? language === 'cs'
              ? 'Žádná bezpečnostní upozornění'
              : 'No security advisories'
            : language === 'cs'
              ? 'Nepodařilo se načíst bezpečnostní upozornění'
              : 'Failed to load security advisories',
        ],
      ] as const) {
        await page.goto(path);
        await expect(page.getByText(message, { exact: true })).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`${path.slice(1)}-${state}.png`),
          fullPage: true,
          scale: 'css',
        });
      }
    });
  }

  for (const level of [1, 99]) {
    test(`signed-in advisory impact level${level} ${language}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await installPublicContentMock(page, 'populated', level);
      await page.goto('/security-advisories');
      const list = page.getByTestId('public.security_advisories.page');
      await expect(list).toContainText('VPSA-2026-77');
      await expect(list).toContainText(language === 'cs' ? 'Týká se mě' : 'Affects me');
      await page.screenshot({ path: testInfo.outputPath('advisories-personal.png'), fullPage: true, scale: 'css' });
      await list.getByRole('link', { name: 'VPSA-2026-77', exact: true }).click();
      const detail = page.getByTestId('public.security_advisory_detail.page');
      await expect(detail.getByRole('link', { name: 'owned-vps.test' })).toHaveAttribute('href', '/app/vps/123');
      await expect(detail).toContainText(language === 'cs' ? contentAdvisory.cs_response : contentAdvisory.en_response);
      await page.screenshot({
        path: testInfo.outputPath('advisory-personal-detail.png'),
        fullPage: true,
        scale: 'css',
      });
    });
  }
}
