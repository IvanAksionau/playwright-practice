import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../framework/pages/login.page';
import { authFile } from '../../shared/config';
import { qaUser } from '../../shared/users';

/**
 * WHERE: the setup project. The chromium project depends on it.
 * WHY: Logging in through the form in every test is slow and flakes on the
 * form you are not trying to test. Save storageState only AFTER the app has
 * landed on Items. Saving on the login screen stores a logged-out cookie jar,
 * and every later test redirects to /login.
 *
 * This file uses @playwright/test, not framework/fixtures. The fixtures log in
 * through the API, which is the wrong door for a test whose job is the form.
 */
setup('authenticate as qa', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(qaUser.email, qaUser.password);
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  // storageState does not create missing parent folders.
  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
