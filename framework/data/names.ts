import { randomUUID } from 'node:crypto';

/**
 * WHERE: any test that creates data.
 * WHY: The suite is fully parallel and the practice server is one shared process.
 * A hardcoded name like "Alpha" collides when two workers create it at once.
 * The interview snippet uses "Alpha" because that exercise runs a single test
 * against an empty app. This helper is the production version of that snippet.
 */
export function uniqueName(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
