/**
 * WHERE: shared by the app, Playwright config, and fixtures.
 * WHY: 127.0.0.1 and localhost are different cookie hosts. If the browser
 * logs in on one and the API client calls the other, storageState is empty
 * and every authenticated test fails with a redirect to /login.
 */
export const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

/**
 * WHERE: playwright.config.ts setup project writes this; the chromium project reads it.
 * WHY: One UI login per run, then every UI test starts already authenticated.
 * The file holds cookies and localStorage. It is a secret for that run, so it stays gitignored.
 */
export const authFile = 'playwright/.auth/qa.json';

export const apiRoutes = {
  health: '/health',
  login: '/api/login',
  me: '/api/me',
  items: '/api/items',
  item: (id: string) => `/api/items/${encodeURIComponent(id)}`,
  manifest: '/api/playback/manifest',
} as const;

/** Use the pathname. A full URL compare breaks when a port or query string differs. */
export function pathnameOf(url: string): string {
  return new URL(url).pathname;
}
