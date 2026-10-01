import { jwtVerify, SignJWT } from 'jose';

import { Role } from '../../generated/prisma/enums.ts';

// docs/backend/security.md › Tokens and cookies. The algorithm is set on sign and on verify, so a
// token cannot choose its own.
const ALGORITHM = 'HS256';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** What an access token says: who, their global role, and whether a temporary password is pending. */
export interface AccessClaims {
  userId: number;
  role: Role;
  mustChangePassword: boolean;
}

export interface AccessTokens {
  sign(claims: AccessClaims): Promise<string>;
  /** The claims of a valid token; nothing for an expired, altered or foreign one. */
  verify(token: string): Promise<AccessClaims | undefined>;
}

const ROLES: readonly unknown[] = Object.values(Role);

export function createAccessTokens(secret: string): AccessTokens {
  const key = new TextEncoder().encode(secret);

  return {
    sign: ({ userId, role, mustChangePassword }) =>
      new SignJWT({ role, mustChangePassword })
        .setProtectedHeader({ alg: ALGORITHM })
        .setSubject(String(userId))
        .setIssuedAt()
        .setExpirationTime(`${String(ACCESS_TOKEN_TTL_SECONDS)}s`)
        .sign(key),

    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });
        const userId = Number(payload.sub);
        const { role, mustChangePassword } = payload;
        if (!Number.isSafeInteger(userId) || !ROLES.includes(role)) return undefined;
        if (typeof mustChangePassword !== 'boolean') return undefined;
        return { userId, role: role as Role, mustChangePassword };
      } catch {
        return undefined;
      }
    },
  };
}
