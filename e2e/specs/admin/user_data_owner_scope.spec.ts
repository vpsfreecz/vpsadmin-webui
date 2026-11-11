import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

type Template = {
  id: number;
  user: { id: number };
  label: string;
  format: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const prefix = 'admin.user.user_data';
const contexts = [
  { name: 'administrator selected owner', level: 99, subject: 42, allowed: true },
  { name: 'administrator own account', level: 99, subject: 7, allowed: true },
  { name: 'support own account', level: 21, subject: 7, allowed: true },
  { name: 'support other owner', level: 21, subject: 42, allowed: false },
] as const;

for (const context of contexts) {
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const) {
    test(`@pr-smoke @pr-smoke-mobile selected user-data retains owner scope: ${context.name} ${language} ${theme}`, async ({
      page,
    }, info) => {
      const reads: Record<string, unknown>[] = [];
      const payloads: { user?: number; label?: string; format?: string; content?: string }[] = [];
      const mutations: string[] = [];
      const errors: string[] = [];
      const owner = context.level === 99 ? context.subject : 7;
      let templates: Template[] = [
        {
          id: 701,
          user: { id: owner },
          label: 'Scoped template',
          format: 'cloudinit_config',
          content: '#cloud-config\npackages: []\n',
          created_at: '2026-11-10T12:34:56Z',
          updated_at: '2026-11-10T12:34:56Z',
        },
      ];

      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(request.method());
      });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST_OWNER_SCOPE',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        authorize: { user: { id: 7, login: 'synthetic-operator', level: context.level } },
        handlers: {
          [`GET users/${context.subject}`]: () => ({
            user: {
              id: context.subject,
              login: `selected-user${context.subject}`,
              level: context.subject === 7 ? context.level : 1,
              email: 'synthetic@example.test',
            },
          }),
          'GET vpses': () => ({ vpses: [] }),
          'GET vps_user_data': ({ params }) => {
            reads.push({ ...params });
            return { vps_user_data: templates };
          },
          'POST vps_user_data': ({ reqJson }) => {
            const input = reqJson as {
              vps_user_data?: { user?: number; label?: string; format?: string; content?: string };
            };
            const payload = input.vps_user_data ?? {};
            payloads.push(payload);
            const created = {
              ...templates[0]!,
              id: 702,
              user: { id: payload.user ?? 7 },
              label: payload.label ?? '',
              format: payload.format ?? '',
              content: payload.content ?? '',
            };
            templates = [created, ...templates];
            return { vps_user_data: created };
          },
        },
      });

      await page.goto(`/admin/users/${context.subject}/user-data`);
      const wrapper = page.getByTestId(prefix);
      await expect(wrapper).toBeVisible();
      if (context.allowed) {
        await expect(page.getByTestId(`${prefix}.row.701`)).toBeVisible();
        await expect(page.getByTestId(`${prefix}.forbidden`)).toHaveCount(0);
        expect(reads.length).toBeGreaterThan(0);
        for (const params of reads) {
          expect(params['vps_user_data[user]']).toBe(context.level === 99 ? String(context.subject) : undefined);
        }
        await page.getByTestId(`${prefix}.create`).click();
        await page.getByTestId(`${prefix}.editor.label`).fill('Owner-bound synthetic template');
        await page.getByTestId(`${prefix}.editor.content`).fill('#cloud-config\npackages: []\n');
        await page.getByTestId(`${prefix}.editor.create`).click();
        await expect(page.getByTestId(`${prefix}.editor.drawer`)).toHaveCount(0);
        await expect(page.getByTestId(`${prefix}.row.702`)).toBeVisible();
        expect(payloads).toHaveLength(1);
        expect(payloads[0]?.user).toBe(context.level === 99 ? context.subject : undefined);
        expect(payloads[0]?.label).toBe('Owner-bound synthetic template');
        expect(mutations).toEqual(['POST']);
      } else {
        await expect(page.getByTestId(`${prefix}.forbidden`)).toBeVisible();
        await expect(wrapper).toContainText(language === 'cs' ? 'Nedostatečná oprávnění' : 'Not allowed');
        await expect(page.getByTestId(`${prefix}.panel`)).toHaveCount(0);
        await expect(page.getByTestId(`${prefix}.row.701`)).toHaveCount(0);
        expect(reads).toEqual([]);
        expect(payloads).toEqual([]);
        expect(mutations).toEqual([]);
      }
      expect(errors).toEqual([]);
      await info.attach('owner-scope', {
        body: JSON.stringify({ context, language, theme, reads, payloads, mutations, errors, fixtureOnly: true }),
        contentType: 'application/json',
      });
    });
  }
}
