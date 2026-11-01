import { createHash, createHmac, hkdfSync, randomBytes } from 'node:crypto';

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

/** The label that makes the successor key the secret's own, apart from any other key drawn from it. */
const SUCCESSOR_LABEL = 'masaha refresh successor';

/**
 * The key that names each refresh token's successor, derived once from the access tokens' secret
 * (HKDF-SHA256 under its own label), so the deployment adds no setting and every instance of the
 * API derives the same key (docs/backend/security.md › Tokens and cookies).
 */
export function successorKeyOf(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, '', SUCCESSOR_LABEL, 32));
}

/**
 * The one token that replaces `token`: an HMAC of it, so a token presented again within the grace
 * gets the same successor, and its copy gains nothing it can keep apart (finding 21).
 */
export function successorOf(token: string, key: Buffer): string {
  return createHmac('sha256', key).update(token).digest('base64url');
}
