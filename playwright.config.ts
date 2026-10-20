import { defineConfig } from '@playwright/test';
import { authFile, baseURL } from './shared/config';

/**
 * WHERE: the top of the framework. Projects decide who logs in and which files run.
 * WHY: UI, logged-out UI, and API are different clients. One project with a shared
 * cookie makes a 401 test accidentally authenticated, and makes an API failure
 * look like a broken login button.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Local retries hide the bug you are trying to study. CI retries exist so a
  // known-flake does not block the pipeline, and trace: 'on-first-retry' gives
  // you the recording of the failed attempt.
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: `${baseURL}/health`,
    // Locally, reuse a server you started yourself with `npm start`.
    // In CI, always start a fresh one so a previous job cannot leak rows.
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      // Logged-in browser tests. They wait for setup, then load the saved session.
      name: 'chromium',
      testDir: './tests/ui',
      testIgnore: /login\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: authFile,
      },
    },
    {
      // The login form itself. storageState would skip the screen we are testing.
      name: 'chromium-guest',
      testDir: './tests/ui',
      testMatch: /login\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      // No browser. A test that only uses `request` must not pay for Chromium,
      // and must not depend on the UI setup project.
      name: 'api',
      testDir: './tests/api',
    },
  ],
});
