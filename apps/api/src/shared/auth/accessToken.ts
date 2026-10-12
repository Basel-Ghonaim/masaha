import { jwtVerify, SignJWT } from 'jose';

// docs/backend/security.md › Tokens and cookies. The algorithm is set on sign and on verify, so a
// token cannot choose its own.
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/**
 * What an access token says: who, and whether a temporary password was pending when it was signed.
 * The role is not in it: requireAuth reads the account's on every request (ADR 0003, revised).
 */
export interface AccessClaims {
  userId: number;
  mustChangePassword: boolean;
}

export interface AccessTokens {
  sign(claims: AccessClaims): Promise<string>;
  /** The claims of a valid token; nothing for an expired, altered or foreign one. */
  verify(token: string): Promise<AccessClaims | undefined>;
}

export function createAccessTokens(secret: string): AccessTokens {
  const key = new TextEncoder().encode(secret);

  return {
    sign: ({ userId, mustChangePassword }) =>
      new SignJWT({ mustChangePassword })
        .setProtectedHeader({ alg: ALGORITHM })
        .setSubject(String(userId))
        .setIssuedAt()
        .setExpirationTime(`${String(ACCESS_TOKEN_TTL_SECONDS)}s`)
        .sign(key),

    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });
        const userId = Number(payload.sub);
        const { mustChangePassword } = payload;
        if (!Number.isSafeInteger(userId) || typeof mustChangePassword !== 'boolean') {
          return undefined;
        }
        return { userId, mustChangePassword };
      } catch {
        return undefined;
      }
    },
  };
}
