/**
 * The wait a `Retry-After` header asks for, in its delta-seconds form only: the API sends whole
 * seconds. The HTTP-date form is not read, because it would depend on the client's clock. Anything
 * else is no answer.
 */
export function retryAfterSeconds(header: unknown): number | undefined {
  if (typeof header !== 'string') return undefined;
  const value = header.trim();
  return /^\d+$/.test(value) ? Number(value) : undefined;
}
