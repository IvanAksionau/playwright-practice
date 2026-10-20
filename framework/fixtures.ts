import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { ItemsApi } from './api/items.api';
import { ItemsPage } from './pages/items.page';
import { LoginPage } from './pages/login.page';
import { WatchPage } from './pages/watch.page';
import { apiRoutes, baseURL } from '../shared/config';
import { otherUser, qaUser, type SeedUser } from '../shared/users';

/**
 * WHERE: the only import specs should use for `test` and `expect`.
 * WHY: Fixtures build page objects and API clients per test and throw them away.
 * A global page object shared across tests leaks cookies and rows between workers.
 *
 * API clients log in through HTTP on purpose. A broken login label must fail
 * the login spec, not the idempotency spec. Playwright creates a fixture only
 * when the spec destructures it, so a UI test does not pay for `otherApi`.
 */

type AppFixtures = {
  loginPage: LoginPage;
  itemsPage: ItemsPage;
  watchPage: WatchPage;
  qaApi: ItemsApi;
  otherApi: ItemsApi;
};

type RequestSource = {
  request: {
    newContext(options: { baseURL: string }): Promise<APIRequestContext>;
  };
};

async function loggedInContext(playwright: RequestSource, user: SeedUser) {
  // Own context per test. dispose() drops the cookie so the next test cannot
  // inherit this user. newContext does not inherit the project storageState.
  const request = await playwright.request.newContext({ baseURL });
  const response = await request.post(apiRoutes.login, {
    data: { email: user.email, password: user.password },
  });
  if (!response.ok()) {
    const body = await response.text();
    await request.dispose();
    throw new Error(`Login failed for ${user.email}: ${response.status()} ${body}`);
  }
  return request;
}

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  itemsPage: async ({ page }, use) => {
    await use(new ItemsPage(page));
  },
  watchPage: async ({ page }, use) => {
    await use(new WatchPage(page));
  },
  qaApi: async ({ playwright }, use) => {
    const request = await loggedInContext(playwright, qaUser);
    await use(new ItemsApi(request));
    await request.dispose();
  },
  otherApi: async ({ playwright }, use) => {
    const request = await loggedInContext(playwright, otherUser);
    await use(new ItemsApi(request));
    await request.dispose();
  },
});

export { expect };
