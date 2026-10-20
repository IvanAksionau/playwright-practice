import { test, expect } from '../../framework/fixtures';
import { readItem } from '../../framework/api/parse';
import { uniqueName } from '../../framework/data/names';
import { baseURL } from '../../shared/config';

/**
 * WHERE: api project. No browser, no storageState.
 * WHY: Auth and validation are cheaper and sharper over HTTP than through a form.
 * The UI cannot submit an empty name because of the required attribute, so only
 * this spec can show the 400 the server owes us.
 */
test('returns 401 without a session', async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL });
  try {
    const response = await request.get('/api/items');
    expect(response.status()).toBe(401);
  } finally {
    await request.dispose();
  }
});

test('returns 400 when the name is missing', async ({ qaApi }) => {
  const response = await qaApi.create('   ');
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'name is required' });
});

test('returns 404 for an unknown id and 403 for someone else', async ({ qaApi, otherApi }) => {
  expect((await qaApi.get('does-not-exist')).status()).toBe(404);

  const created = await qaApi.create(uniqueName('owned'));
  expect(created.status()).toBe(201);
  const item = await readItem(created);

  const foreign = await otherApi.get(item.id);
  expect(foreign.status()).toBe(403);
  expect(await foreign.json()).toEqual({ error: 'forbidden' });
});
