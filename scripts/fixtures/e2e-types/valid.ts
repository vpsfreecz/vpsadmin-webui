import type { Page } from '@playwright/test';
import { installHaveApiMock } from '../../../e2e/fixtures/haveapi';

declare const page: Page;

installHaveApiMock(page, {
  user: { id: 1, login: 'member', level: 1 },
  handlers: {
    'POST items': (ctx) => {
      const parsed: unknown = ctx.request.postDataJSON();
      return { parsed };
    },
  },
});
installHaveApiMock({
  page,
  authorize: { user: { level: 21 } },
  authorizeUser: { user: { login: 'support' } },
});
