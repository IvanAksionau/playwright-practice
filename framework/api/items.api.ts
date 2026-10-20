import type { APIRequestContext, APIResponse } from '@playwright/test';
import { apiRoutes } from '../../shared/config';

/**
 * WHERE: the backend client used by API specs.
 * WHY: Specs should say "create" and "replace", not repeat URLs and headers.
 * This class does not assert status codes. A client that always expects 201
 * cannot be used for the 409 test, and it hides the contract in a helper
 * the report never shows. The spec asserts the status.
 */
export class ItemsApi {
  constructor(private readonly request: APIRequestContext) {}

  list(): Promise<APIResponse> {
    return this.request.get(apiRoutes.items);
  }

  create(name: string, idempotencyKey?: string): Promise<APIResponse> {
    return this.request.post(apiRoutes.items, {
      data: { name },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  }

  get(id: string): Promise<APIResponse> {
    return this.request.get(apiRoutes.item(id));
  }

  replace(id: string, body: { name: string; expectedVersion?: number }): Promise<APIResponse> {
    return this.request.put(apiRoutes.item(id), { data: body });
  }
}
