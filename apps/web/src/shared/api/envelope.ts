import type { SuccessEnvelope } from '@masaha/shared/core';

/**
 * The payload of a success answer. A call unwraps at its own site and keeps the response, so `meta`
 * stays reachable for the calls that need it. A 204 has no body, and is never unwrapped.
 */
export function unwrap<T>(response: { data: SuccessEnvelope<T> }): T {
  return response.data.data;
}
