import { createHash, randomBytes } from 'node:crypto';

/** A new opaque token: 256 random bits, URL-safe. Only its hash is ever stored. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * What the database stores for a token. SHA-256 needs no salt or work factor here: the token is
 * random and long, so nothing can be guessed from its hash.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
