import type { Locator, Page } from '@playwright/test';

/**
 * WHERE: UI structure for /login.
 * WHY: Locators are created once and stay lazy. Playwright re-reads the DOM
 * on each click, so a re-render does not stale them. Do not store ElementHandles.
 * Assertions stay in the spec. A page object that asserts "the error is visible"
 * hides the check from the person reading the test.
 */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly signIn: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    // Assigned in the constructor, not as class fields. With ES2022, field
    // initializers run before `page` exists, and `this.page` would be undefined.
    // The Locator object is lazy: it does not query the DOM until an action.
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.signIn = page.getByRole('button', { name: 'Sign in' });
    this.error = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signIn.click();
  }
}
