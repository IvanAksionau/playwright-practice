import type { Locator, Page } from '@playwright/test';

/**
 * WHERE: UI structure for /watch.
 * WHY: The play control is a real button. The <video> element has no role we
 * want to target, and its native controls sit in shadow DOM, so a CSS locator
 * for the single video on the page is the honest choice.
 */
export class WatchPage {
  readonly play: Locator;
  readonly video: Locator;

  constructor(private readonly page: Page) {
    this.play = page.getByRole('button', { name: 'Play' });
    this.video = page.locator('video');
  }

  async goto(): Promise<void> {
    await this.page.goto('/watch');
  }
}
