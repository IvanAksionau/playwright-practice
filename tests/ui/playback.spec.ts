import { apiRoutes, pathnameOf } from '../../shared/config';
import { test, expect } from '../../framework/fixtures';

/**
 * WHERE: logged-in UI project, the player screen.
 * WHY: A sleep "until the spinner is probably gone" passes on a black frame.
 * The manifest response proves the play command reached the backend.
 * The video element proves frames are actually available. Both are required.
 */
test('play waits for the manifest and a playing element, then reload stops it', async ({
  page,
  watchPage,
}) => {
  await watchPage.goto();

  const manifest = page.waitForResponse(
    (response) =>
      pathnameOf(response.url()) === apiRoutes.manifest && response.status() === 200,
  );
  await watchPage.play.click();
  await manifest;

  await expect
    .poll(() =>
      watchPage.video.evaluate((element) => {
        const video = element as HTMLVideoElement;
        // readyState 3 is HAVE_FUTURE_DATA. 4 also passes. 2 means we have
        // the current frame and will stall, which the user sees as buffering.
        return !video.paused && video.readyState >= 3;
      }),
    )
    .toBe(true);

  await page.reload();
  await expect(watchPage.play).toBeVisible();
  await expect
    .poll(() =>
      watchPage.video.evaluate((element) => {
        const video = element as HTMLVideoElement;
        return video.paused && video.currentSrc === '';
      }),
    )
    .toBe(true);
});
