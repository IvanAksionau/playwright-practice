import { randomBytes, randomUUID } from 'node:crypto';
import type { Item } from '../shared/item';
import { otherUser, qaUser, type SeedUser } from '../shared/users';

/**
 * WHERE: process memory inside the practice server. Tests must not import this file.
 * WHY: Importing the store from a spec checks a Map, not HTTP. The bug you ship
 * is usually in status codes, cookies, or JSON. Hit the routes instead.
 *
 * A production store is a database. The idempotency Map below is safe only
 * because Node runs this file in one process and the check-then-insert is
 * synchronous. Two app instances need a unique constraint on
 * (user, idempotency key), not a Map.
 */

type UserRecord = SeedUser;

type IdempotencyRecord = {
  fingerprint: string;
  itemId: string;
};

export class Store {
  private readonly usersByEmail = new Map<string, UserRecord>();
  private readonly usersById = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, string>();
  private readonly items = new Map<string, Item>();
  private readonly idempotency = new Map<string, IdempotencyRecord>();

  constructor(users: readonly UserRecord[]) {
    for (const user of users) {
      this.usersByEmail.set(user.email, user);
      this.usersById.set(user.id, user);
    }
  }

  login(email: string, password: string): { token: string; userId: string; email: string } | undefined {
    const user = this.usersByEmail.get(email);
    if (!user || user.password !== password) return undefined;
    const token = randomBytes(24).toString('hex');
    this.sessions.set(token, user.id);
    return { token, userId: user.id, email: user.email };
  }

  userIdForToken(token: string | undefined): string | undefined {
    if (!token) return undefined;
    return this.sessions.get(token);
  }

  listItems(userId: string): Item[] {
    return [...this.items.values()].filter((item) => item.ownerId === userId);
  }

  getItem(userId: string, id: string): { status: 200; item: Item } | { status: 403 | 404; error: string } {
    const item = this.items.get(id);
    if (!item) return { status: 404, error: 'not_found' };
    // 403 admits the id exists. Some APIs return 404 here so a caller cannot
    // probe other people's ids. Say that tradeoff out loud in an interview.
    if (item.ownerId !== userId) return { status: 403, error: 'forbidden' };
    return { status: 200, item };
  }

  /**
   * POST is not idempotent: each call without a key creates a new row.
   * The same Idempotency-Key plus the same body returns the original row.
   * The same key plus a different body is a client bug: 409, no second row.
   */
  createItem(
    userId: string,
    name: string,
    idempotencyKey?: string,
  ): { status: 201; item: Item; replayed: boolean } | { status: 409; error: string } {
    if (idempotencyKey) {
      const mapKey = `${userId}:${idempotencyKey}`;
      const fingerprint = JSON.stringify({ name });
      const existing = this.idempotency.get(mapKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return { status: 409, error: 'idempotency_key_reused' };
        }
        const item = this.items.get(existing.itemId);
        if (!item) return { status: 409, error: 'idempotency_key_reused' };
        return { status: 201, item, replayed: true };
      }
      const item = this.insert(userId, name);
      this.idempotency.set(mapKey, { fingerprint, itemId: item.id });
      return { status: 201, item, replayed: false };
    }

    return { status: 201, item: this.insert(userId, name), replayed: false };
  }

  /**
   * PUT replaces the name. The same body sent twice leaves one row and the
   * same version: that is idempotent.
   * expectedVersion is a different rule, optimistic locking. The first match
   * wins and bumps the version. A retry that still carries the old version
   * gets 409 and must not write. Do not describe that 409 as "PUT is not idempotent".
   */
  replaceItem(
    userId: string,
    id: string,
    name: string,
    expectedVersion?: number,
  ): { status: 200; item: Item } | { status: 400 | 403 | 404 | 409; error: string } {
    const found = this.getItem(userId, id);
    if (found.status !== 200) return found;

    if (expectedVersion !== undefined && expectedVersion !== found.item.version) {
      return { status: 409, error: 'stale' };
    }

    const next: Item = {
      ...found.item,
      name,
      version: expectedVersion === undefined ? found.item.version : found.item.version + 1,
    };
    this.items.set(id, next);
    return { status: 200, item: next };
  }

  private insert(userId: string, name: string): Item {
    const item: Item = {
      id: randomUUID(),
      name,
      ownerId: userId,
      version: 1,
    };
    this.items.set(item.id, item);
    return item;
  }
}

export const store = new Store([qaUser, otherUser]);
