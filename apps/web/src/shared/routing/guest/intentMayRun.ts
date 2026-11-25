import type { SessionState } from '@shared/session';

/**
 * Whether a guest's held action may run now (ADR 0021, point 2): with a session, and no temporary
 * password still to change. Until the change, the gate keeps the user on it and every other request
 * is refused (`PASSWORD_CHANGE_REQUIRED`), so the action waits, still held, and runs once it is done.
 */
export function intentMayRun(session: SessionState): boolean {
  return session.status === 'authenticated' && !session.user.mustChangePassword;
}
