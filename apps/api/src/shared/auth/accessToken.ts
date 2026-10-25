import { jwtVerify, SignJWT } from 'jose';

// docs/backend/security.md › Tokens and cookies. The algorithm is set on sign and on verify, so a
// token cannot choose its own.
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/**
 * What an access token says: who, whether a temporary password was pending when it was signed, the
 * account's session version then, and which session signed it. The role is not in it: requireAuth
 * reads the account's on every request (ADR 0003, revised).
 */
export interface AccessClaims {
  userId: number;
  mustChangePassword: boolean;
  /** The account's session version when it was signed: once every session ends, it is refused. */
  sessionVersion: number;
  /** The session it was signed for: its refresh-token family's id, the claim `sid`. */
  sessionId: number;
}

export interface AccessTokens {
  sign(claims: AccessClaims): Promise<string>;
  /** The claims of a valid token; nothing for an expired, altered or foreign one. */
  verify(token: string): Promise<AccessClaims | undefined>;
}

export function createAccessTokens(secret: string): AccessTokens {
  const key = new TextEncoder().encode(secret);

  return {
    sign: ({ userId, mustChangePassword, sessionVersion, sessionId }) =>
      new SignJWT({ mustChangePassword, sessionVersion, sid: sessionId })
        .setProtectedHeader({ alg: ALGORITHM })
        .setSubject(String(userId))
        .setIssuedAt()
        .setExpirationTime(`${String(ACCESS_TOKEN_TTL_SECONDS)}s`)
        .sign(key),

    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });
        const userId = Number(payload.sub);
        const { mustChangePassword, sessionVersion, sid } = payload;
        if (
          !Number.isSafeInteger(userId) ||
          typeof mustChangePassword !== 'boolean' ||
          typeof sessionVersion !== 'number' ||
          !Number.isSafeInteger(sessionVersion) ||
          sessionVersion < 0 ||
          typeof sid !== 'number' ||
          !Number.isSafeInteger(sid) ||
          sid < 1
        ) {
          return undefined;
        }
        return { userId, mustChangePassword, sessionVersion, sessionId: sid };
      } catch {
        return undefined;
      }
    },
  };
}
