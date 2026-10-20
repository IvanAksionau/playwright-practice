import { test, expect } from '../../framework/fixtures';
import { qaUser } from '../../shared/users';

/**
 * WHERE: chromium-guest project. No storageState.
 * WHY: This is the one UI test that is allowed to use the login form.
 * The happy path also protects the setup project: if the form breaks,
 * this spec says so directly instead of every other spec timing out.
 */
test('rejects a wrong password', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(qaUser.email, 'not-the-password');
  await expect(loginPage.error).toBeVisible();
  await expect(loginPage.error).toHaveText('Wrong email or password');
});

test('signs in and opens the item list', async ({ page, loginPage, itemsPage }) => {
  await loginPage.goto();
  await loginPage.login(qaUser.email, qaUser.password);
  await expect(page).toHaveURL(/\/items$/);
  await expect(itemsPage.heading).toBeVisible();
});
