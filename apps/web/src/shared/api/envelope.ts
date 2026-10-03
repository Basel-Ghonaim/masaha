/**
 * A success answer (docs/api/api-contract.md §2). `meta` is the pagination of a list (§4), or what an
 * endpoint adds, such as the front desk's warnings. A 204 has no body, and is never unwrapped.
 */
export type ApiEnvelope<T, M = unknown> = { success: true; data: T; meta?: M };

/**
 * The payload of a success answer. A call unwraps at its own site and keeps the response, so `meta`
 * stays reachable for the calls that need it.
 */
export function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data;
}
