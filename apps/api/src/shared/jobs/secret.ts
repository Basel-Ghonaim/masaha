import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Whether an `Authorization` header is exactly `Bearer <secret>`, compared in constant time: the
 * two SHA-256 digests, so their lengths always match (docs/backend/security.md › HTTP hardening).
 */
export function matchesSecret(header: string | undefined, secret: string): boolean {
  if (header === undefined) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
