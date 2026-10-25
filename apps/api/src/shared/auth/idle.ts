import type { RequestHandler } from 'express';

import type { Role, SpaceManagerRole } from '../../generated/prisma/enums.ts';

declare module 'express-serve-static-core' {
  interface Request {
    /** A passive route's request, set by markPassive: it renews no idle session. */
    passive?: boolean;
  }
}

/**
 * Whether the account's sessions end when idle (docs/backend/security.md › Tokens and cookies):
 * reception only — an active `RECEPTION` link, no active `OWNER` link, and not the admin. The links
 * are read only when the role leaves it open.
 */
export async function isIdleBound(
  role: Role,
  linkRoles: () => Promise<readonly SpaceManagerRole[]>,
): Promise<boolean> {
  if (role === 'ADMIN') return false;
  const roles = await linkRoles();
  return roles.includes('RECEPTION') && !roles.includes('OWNER');
}

/** What requireAuth asks of the sessions, for an idle-bound account. */
export interface IdleSessions {
  /** The roles of the account's active links, at any space. */
  linkRolesOf(userId: number): Promise<readonly SpaceManagerRole[]>;
  /**
   * The session's state: gone (signed out or ended), idle past its minutes, or live — renewed when
   * live and `renew`, at most once a minute.
   */
  stateOf(sessionId: number, renew: boolean): Promise<'ended' | 'idle' | 'live'>;
}

/**
 * Marks the request passive, so it renews no idle session. Mounted ahead of the guard, on the routes
 * a screen polls by itself (the desk's state): a desk left open with no one at it ends its session.
 */
export const markPassive: RequestHandler = (req, _res, next) => {
  req.passive = true;
  next();
};
