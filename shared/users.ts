/**
 * WHERE: seed data for the practice server and the tests.
 * WHY: The email and password live in one place so the setup project and the
 * API fixtures cannot drift apart. On a real project these come from a vault
 * or a test-data API, never from the git history. The password is plaintext
 * here only because this server is a local double, not a product.
 */
export const qaUser = {
  id: 'user-qa',
  email: 'qa@example.com',
  password: 'secret',
} as const;

export const otherUser = {
  id: 'user-other',
  email: 'other@example.com',
  password: 'secret',
} as const;

export type SeedUser = typeof qaUser | typeof otherUser;
