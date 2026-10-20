import { test, expect } from '../../framework/fixtures';
import { readItem, readItems } from '../../framework/api/parse';
import { uniqueName } from '../../framework/data/names';

/**
 * WHERE: api project.
 * WHY: These rules are about server state. A button test cannot see whether
 * the second call stored a second row. Keep each test independent: no serial
 * mode, no "Alpha" left behind by the previous test.
 *
 * POST  — another call, another row, unless the client sends an idempotency key.
 * PUT   — the same body again leaves one row. That is idempotent.
 * PUT + expectedVersion — optimistic lock. A stale retry is 409 and does not write.
 *         That 409 is not "PUT failed to be idempotent".
 */
test('two POSTs without a key create two items', async ({ qaApi }) => {
  const name = uniqueName('post');

  const first = await readItem(await qaApi.create(name));
  const second = await readItem(await qaApi.create(name));

  expect(second.id).not.toBe(first.id);
  const mine = (await readItems(await qaApi.list())).filter((item) => item.name === name);
  expect(mine).toHaveLength(2);
});

test('the same idempotency key returns the original item', async ({ qaApi }) => {
  const name = uniqueName('once');
  const key = uniqueName('key');

  const firstResponse = await qaApi.create(name, key);
  const secondResponse = await qaApi.create(name, key);

  expect(firstResponse.status()).toBe(201);
  expect(secondResponse.status()).toBe(201);
  expect(secondResponse.headers()['idempotency-replayed']).toBe('true');

  const first = await readItem(firstResponse);
  const second = await readItem(secondResponse);
  expect(second).toEqual(first);

  const mine = (await readItems(await qaApi.list())).filter((item) => item.id === first.id);
  expect(mine).toHaveLength(1);
});

test('reusing an idempotency key with a different body is a conflict', async ({ qaApi }) => {
  const key = uniqueName('key');
  expect((await qaApi.create(uniqueName('a'), key)).status()).toBe(201);

  const conflict = await qaApi.create(uniqueName('b'), key);
  expect(conflict.status()).toBe(409);
  expect(await conflict.json()).toEqual({ error: 'idempotency_key_reused' });
});

test('repeating a PUT keeps one item and the same version', async ({ qaApi }) => {
  const created = await readItem(await qaApi.create(uniqueName('put')));
  const renamed = 'Renamed';

  expect((await qaApi.replace(created.id, { name: renamed })).status()).toBe(200);
  const again = await readItem(await qaApi.replace(created.id, { name: renamed }));

  expect(again).toEqual({ ...created, name: renamed });
  const mine = (await readItems(await qaApi.list())).filter((item) => item.id === created.id);
  expect(mine).toHaveLength(1);
});

test('a stale expectedVersion does not overwrite a newer name', async ({ qaApi }) => {
  const created = await readItem(await qaApi.create(uniqueName('lock')));

  const first = await qaApi.replace(created.id, {
    name: 'First write',
    expectedVersion: created.version,
  });
  expect(first.status()).toBe(200);

  const stale = await qaApi.replace(created.id, {
    name: 'Lost update',
    expectedVersion: created.version,
  });
  expect(stale.status()).toBe(409);
  expect(await stale.json()).toEqual({ error: 'stale' });

  const current = await readItem(await qaApi.get(created.id));
  expect(current.name).toBe('First write');
  expect(current.version).toBe(created.version + 1);
});
