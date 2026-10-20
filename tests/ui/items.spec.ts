import { apiRoutes, pathnameOf } from '../../shared/config';
import { uniqueName } from '../../framework/data/names';
import { readItem } from '../../framework/api/parse';
import { test, expect } from '../../framework/fixtures';

/**
 * WHERE: logged-in UI project. The session comes from storageState.
 * WHY: This is the interview exercise "do something, see the response, reload".
 * The reload is the proof that the server kept the row. The row you saw
 * before the reload can be optimistic UI that never reached the API.
 */
test('created item survives a reload', async ({ page, itemsPage }) => {
  const name = uniqueName('item');
  await itemsPage.goto();
  await expect(itemsPage.heading).toBeVisible();

  await test.step('create and wait for the POST', async () => {
    await itemsPage.newItem.click();
    await itemsPage.nameInput.fill(name);

    // Subscribe before the click. A listener registered after the click
    // misses a fast response and the test waits until timeout.
    const create = page.waitForResponse(
      (response) =>
        pathnameOf(response.url()) === apiRoutes.items &&
        response.request().method() === 'POST',
    );
    await itemsPage.save.click();

    const response = await create;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toEqual({ name });
    // The page reads the POST body in items.js. If it did not, this json()
    // would wait until the test timeout. See the comment there.
    expect((await readItem(response)).name).toBe(name);
  });

  await test.step('reload and read what the server returned', async () => {
    await expect(itemsPage.cell(name)).toBeVisible();
    await page.reload();
    // toBeVisible waits. The list is empty until GET /api/items comes back
    // and the page script draws the cell. No waitForTimeout.
    await expect(itemsPage.cell(name)).toBeVisible();
  });
});

/**
 * WHY the timer lives in the route and not in the test: we are making the
 * product slow so two clicks overlap. page.waitForTimeout would only pause
 * the test and would not prove that two requests were in flight.
 */
test('a second Save while the POST is in flight creates another request', async ({ page, itemsPage }) => {
  let inFlight = 0;
  let maxInFlight = 0;

  await page.route(`**${apiRoutes.items}`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 400));
    inFlight -= 1;
    await route.continue();
  });

  await itemsPage.goto();
  await itemsPage.newItem.click();
  await itemsPage.nameInput.fill(uniqueName('double'));
  await itemsPage.save.click();
  await itemsPage.save.click();

  await expect.poll(() => maxInFlight).toBe(2);
  await expect.poll(() => inFlight).toBe(0);
});
