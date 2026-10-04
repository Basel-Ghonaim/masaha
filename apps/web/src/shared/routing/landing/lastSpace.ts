import type { SessionSpaceLink } from '@masaha/shared/space-links';
import type { SessionUser } from '@shared/session';

/** One key per user, so two accounts on one device never land on each other's space. */
function keyFor(userId: number): string {
  return `masaha.lastSpace.${String(userId)}`;
}

/**
 * Remembers the space the user opened last, for the landing, in the browser's `localStorage`.
 * Reaching it throws when the browser blocks storage, so it is reached here, inside the catch:
 * storage that is unavailable remembers nothing.
 */
export function rememberSpace(userId: number, spaceId: number): void {
  try {
    localStorage.setItem(keyFor(userId), String(spaceId));
  } catch {
    // Storage is blocked or full: the landing falls back to the oldest link.
  }
}

/**
 * The user's active link at the space they opened last, or nothing: when none is remembered, when
 * the user no longer holds an active link there, or when storage is unavailable.
 */
export function lastSpace(user: SessionUser): SessionSpaceLink | undefined {
  let remembered: string | null;
  try {
    remembered = localStorage.getItem(keyFor(user.id));
  } catch {
    return undefined;
  }
  return user.spaces.find(({ spaceId }) => String(spaceId) === remembered);
}
