import type { Locator, Page } from '@playwright/test';

/**
 * WHERE: UI structure for /items.
 * WHY: getByRole / getByLabel follow the accessible name a user hears.
 * A CSS nth-child breaks when a column is added. getByTestId is the fallback
 * for controls that have no accessible name, not the default.
 */
export class ItemsPage {
  readonly heading: Locator;
  readonly newItem: Locator;
  readonly nameInput: Locator;
  readonly save: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Items' });
    this.newItem = page.getByRole('button', { name: 'New item' });
    this.nameInput = page.getByLabel('Name');
    this.save = page.getByRole('button', { name: 'Save' });
  }

  cell(name: string): Locator {
    // A row's accessible name includes every control in it. A cell with the
    // exact name stays stable once a Delete button is added to the row.
    return this.page.getByRole('cell', { name, exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/items');
  }
}
