import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { installIncidentPolicyFixture } from '../../fixtures/incidentPolicies';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['en', 'cs'] as const) {
  for (const admin of [false, true]) {
    test('@pr-smoke @pr-smoke-mobile generic policies ' + language + ' admin=' + admin, async ({ page }, testInfo) => {
      const fixture = await installIncidentPolicyFixture(page, { admin, language });
      const prefix = admin ? '/admin' : '/app';
      const context = admin ? '?user=7' : '';
      await page.goto(prefix + '/vps/123' + context);
      await expect(page.getByTestId('vps.incidents.threshold')).toBeVisible();
      await expect(page.getByTestId('vps.incidents.threshold')).toContainText(
        language === 'en'
          ? 'Too many incident reports: warning limit reached'
          : 'Počet hlášení incidentů dosáhl limitu pro upozornění'
      );
      const reportsTab = page.getByRole('link', {
        name: language === 'en' ? 'Incident reports' : 'Hlášení incidentů',
        exact: true,
      });
      await expect(reportsTab).toHaveAttribute('href', prefix + '/incidents?' + (admin ? 'user=7&' : '') + 'vps=123');
      await expect(
        page.getByRole('link', { name: language === 'en' ? 'Incident policies' : 'Pravidla incidentů', exact: true })
      ).toHaveAttribute('href', prefix + '/vps/123/incidents' + context);

      await expect(page.getByTestId('vps.incident')).toHaveCount(0);
      const destination = prefix + '/vps/123/incidents' + context;
      await expect(page.locator('a[href="' + destination + '"]').first()).toBeVisible();
      await page
        .locator('a[href="' + destination + '"]')
        .first()
        .click();
      const first = page.getByTestId('vps.incidents.policy.alpha');
      const second = page.getByTestId('vps.incidents.policy.beta');
      await expect(first.getByRole('columnheader')).toHaveText(
        language === 'en' ? ['Period', 'Incidents', 'Limit', 'Action'] : ['Období', 'Počet incidentů', 'Limit', 'Akce']
      );
      await expect(first.getByRole('row').nth(1).getByRole('cell')).toHaveText(
        language === 'en' ? ['7 days', '6', '5', 'Warning'] : ['7 dní', '6', '5', 'Upozornění']
      );
      await expect(first.getByRole('row').nth(2).getByRole('cell')).toHaveText(
        language === 'en' ? ['30 days', '8', '10', 'VPS stop'] : ['30 dní', '8', '10', 'Vypnutí VPS']
      );
      await expect(second.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText('0');
      await expect(second.getByRole('row').nth(1).getByRole('cell').nth(2)).toHaveText('3');
      await expect(page.getByTestId('vps.incidents.shared')).toHaveCount(1);
      await expect(page.getByTestId('vps.incidents.limits')).toHaveCount(admin ? 2 : 0);
      await expect(page.getByTestId('vps.incidents.permission')).toHaveCount(admin ? 1 : 0);
      const shared = page.getByTestId('vps.incidents.shared');
      await expect(
        first.getByText(language === 'en' ? 'Last incident' : 'Poslední incident', { exact: true })
      ).toBeVisible();
      await expect(
        shared.getByText(
          language === 'en' ? 'Last confirmed automatic shutdown' : 'Poslední potvrzené automatické vypnutí',
          { exact: true }
        )
      ).toBeVisible();
      await expect(first.locator('details')).toHaveCount(0);
      await expect(shared.locator('details')).toHaveCount(0);
      const warningLabel = language === 'en' ? 'Warning limit' : 'Limit pro upozornění';
      const stopLabel = language === 'en' ? 'Shutdown limit' : 'Limit pro vypnutí';
      const intentLabels = language === 'en' ? 'Inherited / Custom' : 'Výchozí / Vlastní';
      if (admin) {
        await expect(first.getByLabel(warningLabel, { exact: true })).toHaveValue('5');
        await expect(first.getByLabel(stopLabel, { exact: true })).toHaveValue('10');
        await expect(first.getByRole('combobox').nth(0)).toHaveValue('custom');
        await expect(first.getByRole('combobox').nth(1)).toHaveValue('custom');
        await expect(second.getByLabel(warningLabel, { exact: true })).toHaveValue('3');
        await expect(second.getByLabel(stopLabel, { exact: true })).toHaveValue('9');
        await expect(second.getByRole('combobox').nth(0)).toHaveValue('inherited');
        await expect(second.getByRole('combobox').nth(1)).toHaveValue('inherited');
        await expect(
          second.getByText(language === 'en' ? '3 reports in 7 days' : '3 hlášení za 7 dní', { exact: true })
        ).toBeVisible();
      }
      await page.evaluate(async () => {
        window.scrollTo(0, 0);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await document.fonts.ready;
      });
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('generic-policies.png'), fullPage: true, scale: 'css' });
      if (admin) {
        await first
          .getByRole('combobox', { name: `${warningLabel} (${intentLabels})`, exact: true })
          .selectOption('inherited');
        await expect(first.getByLabel(warningLabel, { exact: true })).toHaveValue('');
        await expect(first.getByLabel(stopLabel, { exact: true })).toHaveValue('10');
        await expect(first.getByRole('combobox', { name: `${stopLabel} (${intentLabels})`, exact: true })).toHaveValue(
          'custom'
        );
        await expect(
          first.getByText(language === 'en' ? 'Inherited after saving' : 'Výchozí po uložení', { exact: true })
        ).toBeVisible();
        await first
          .getByRole('button', { name: language === 'en' ? 'Use inherited limits' : 'Použít výchozí limity' })
          .click();
        expect(fixture.writes).toHaveLength(0);
        await first.getByRole('button', { name: language === 'en' ? 'Save' : 'Uložit', exact: true }).click();
        await page.getByTestId('vps.incidents.confirm.confirm').click();
        await expect(page.getByTestId('vps.incidents.confirm')).toHaveCount(0);
        expect(fixture.writes).toEqual([
          {
            path: '/api/v7.0/vpses/123/incident_policies/alpha',
            body: { incident_policy: { warning_limit_override: null, stop_limit_override: null } },
          },
        ]);
        await expect(first.getByLabel(warningLabel, { exact: true })).toHaveValue('5');
        await expect(first.getByLabel(stopLabel, { exact: true })).toHaveValue('10');
        await expect(first.getByRole('combobox').nth(0)).toHaveValue('inherited');
        await expect(first.getByRole('combobox').nth(1)).toHaveValue('inherited');
        await shared.getByRole('checkbox').uncheck();
        await shared.getByRole('button', { name: language === 'en' ? 'Save' : 'Uložit', exact: true }).click();
        await page.getByTestId('vps.incidents.confirm.confirm').click();
        await expect(page.getByTestId('vps.incidents.confirm')).toHaveCount(0);
        expect(fixture.writes[1]).toEqual({
          path: '/api/v7.0/vpses/123',
          body: { vps: { incident_enforcement_enabled: false } },
        });
      }
      await first
        .getByRole('link', { name: language === 'en' ? 'Incident history' : 'Historie incidentů', exact: true })
        .click();
      await expect
        .poll(() => fixture.historyQueries.some((query) => query['incident_report[policy_key]'] === 'alpha'))
        .toBe(true);
      await expect(page.getByTestId('incidents.policyFilter').getByRole('combobox')).toHaveValue('alpha');
      await page.getByRole('link', { name: '#88', exact: true }).first().click();
      await expect(page.getByTestId('incidents.policyHistory')).toContainText(
        language === 'en' ? 'Saved historical policy' : 'Uložené historické pravidlo'
      );
      await expect(page.getByTestId('incidents.detail.text')).toContainText('SYNTHETIC immutable source facts.');
      const history = page.getByTestId('incidents.policyHistory');
      await expect(history).toContainText(language === 'en' ? 'Matched policies' : 'Odpovídající pravidla');
      await expect(history.getByTestId('incidents.policyHistory.other')).toHaveCount(admin ? 1 : 0);
      if (!admin) {
        await expect(history).not.toContainText('SYNTHETIC unmatched policy');
        await expect(history).not.toContainText('SYNTHETIC selection error');
      }
      await expect(
        history.getByRole('link', { name: language === 'en' ? 'View policy' : 'Zobrazit pravidlo', exact: true })
      ).toHaveCount(2);
      await expect(history.locator(`a[href="${prefix}/vps/123/incidents#incident-policy-alpha"]`)).toBeVisible();
      await expect(history.locator(`a[href="${prefix}/vps/123/incidents#incident-policy-beta"]`)).toBeVisible();
      await expect(history.locator(`a[href="${prefix}/incidents?vps=123&policy_key=retired_key"]`)).toBeVisible();
      await expect(history.locator('a[href*="#incident-policy-retired_key"]')).toHaveCount(0);
      await expect(history).toContainText(language === 'en' ? 'Second saved policy' : 'Druhé uložené pravidlo');
      await expect(history).toContainText(language === 'en' ? 'Retired saved policy' : 'Dřívější uložené pravidlo');
      await expect(history.getByTestId('incidents.policyCounts')).toHaveCount(3);

      await page.evaluate(async () => {
        window.scrollTo(0, 0);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('generic-policy-history.png'), fullPage: true, scale: 'css' });
      await page.goto(prefix + '/incidents/89');
      const notice = page.getByTestId('incidents.notice');
      await expect(notice.getByTestId('incidents.notice.policy')).toContainText('Saved originating policy');
      await expect(notice.getByTestId('incidents.notice.policy')).toContainText('alpha');
      await expect(notice).not.toContainText('Second saved policy');
      await expect(
        notice.getByRole('link', { name: language === 'en' ? 'Incident history' : 'Historie incidentů', exact: true })
      ).toHaveAttribute('href', prefix + '/incidents?vps=123&policy_key=alpha');
      await expect(page.getByTestId('incidents.policyHistory')).toHaveCount(0);
      expect(fixture.evaluationReads.every((id) => id === 88)).toBe(true);
      await expectNoDocumentHorizontalOverflow(page);
    });
  }
}

test('@pr-smoke @pr-smoke-mobile generic registry filters preserve owner and combined selections', async ({ page }) => {
  const fixture = await installIncidentPolicyFixture(page, { admin: true, language: 'en' });
  await page.goto('/admin/vps?user=7');
  await page.getByLabel('Policy', { exact: true }).selectOption('alpha');
  await page.getByLabel('Incident status', { exact: true }).selectOption('warning');
  await page.getByLabel('Automatic shutdown exemption', { exact: true }).selectOption('false');
  await expect
    .poll(() =>
      fixture.listQueries.some(
        (query) =>
          query['vps[incident_policy]'] === 'alpha' &&
          query['vps[incident_status]'] === 'warning' &&
          query['vps[incident_enforcement_enabled]'] === 'false' &&
          query['vps[user]'] === '7'
      )
    )
    .toBe(true);
  await page.goto(
    '/admin/incidents?user=7&vps=123&codename=synthetic_source&policy_key=retired_key&limit=25&page=4&from_id=90'
  );
  const policies = page.getByTestId('incidents.policyFilter').getByRole('combobox');
  await expect(policies).toBeEnabled();
  await expect(policies).toHaveValue('retired_key');
  await expect(policies.getByRole('option')).toHaveText([
    'All policies',
    'Synthetic policy A',
    'Synthetic policy B',
    'retired_key',
  ]);
  await policies.selectOption('beta');
  await expect
    .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
    .toEqual({
      user: '7',
      vps: '123',
      codename: 'synthetic_source',
      policy_key: 'beta',
      limit: '25',
      page: '1',
    });
  await expect
    .poll(() =>
      fixture.historyQueries.some(
        (query) => query['incident_report[policy_key]'] === 'beta' && query['incident_report[vps]'] === '123'
      )
    )
    .toBe(true);
});

test('@pr-smoke @pr-smoke-mobile older API leaves normal VPS detail without generic incident tab', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    handlers: {
      'GET vpses/123': () => ({
        vps: { id: 123, hostname: 'older.example.test', object_state: 'active', user: { id: 1 }, node: { id: 1 } },
      }),
    },
  });
  await page.goto('/app/vps/123');
  await expect(page.getByTestId('vps.overview.control_center')).toBeVisible();
  await expect(page.locator('a[href="/app/vps/123/incidents"]')).toHaveCount(0);
  await expect(page.getByTestId('vps.incidents.threshold')).toHaveCount(0);
});
