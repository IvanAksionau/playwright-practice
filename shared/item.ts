/**
 * WHERE: the HTTP contract, shared by the server and the tests.
 * WHY: Tests that invent their own shape of "an item" keep passing after the
 * API changes. A real codebase would generate this from OpenAPI. Hand-written
 * types are the same idea at practice scale: one definition, checked at both ends.
 */
export type Item = {
  id: string;
  name: string;
  ownerId: string;
  version: number;
};

export function isItem(value: unknown): value is Item {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.ownerId === 'string' &&
    typeof item.version === 'number'
  );
}
