import { IDEMPOTENCY_KEY_HEADER } from '@masaha/shared/core';
import type { AxiosRequestConfig } from 'axios';

/**
 * A request's config carrying an intent's key (ADR 0015): the server answers a key once, and the
 * transport re-sends only a keyed write (docs/frontend/architecture.md §7).
 */
export function withIdempotencyKey(key: string): AxiosRequestConfig {
  return { headers: { [IDEMPOTENCY_KEY_HEADER]: key } };
}
