import type { HaveApiMock } from '../../../e2e/fixtures/haveapi';

declare const mock: HaveApiMock;
mock.addHandler(42, () => undefined);
