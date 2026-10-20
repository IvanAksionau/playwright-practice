import { isItem, type Item } from '../../shared/item';

/**
 * WHERE: the boundary between HTTP and typed objects.
 * WHY: `as Item` tells TypeScript to trust the network. A type guard checks
 * the payload. When the API drops a field, the test fails here with the body
 * in the message instead of throwing later on `item.version` of undefined.
 *
 * The parameter is only `{ json() }`. A browser `Response` from
 * `page.waitForResponse` and an `APIResponse` from the API client are different
 * classes. Both can be read here, so the UI spec and the API spec share one parser.
 */
type JsonResponse = {
  json: () => Promise<unknown>;
};

export async function readItem(response: JsonResponse): Promise<Item> {
  const body: unknown = await response.json();
  if (!isItem(body)) {
    throw new Error(`Expected an item, received ${JSON.stringify(body)}`);
  }
  return body;
}

export async function readItems(response: JsonResponse): Promise<Item[]> {
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isItem)) {
    throw new Error(`Expected an item list, received ${JSON.stringify(body)}`);
  }
  return body;
}
