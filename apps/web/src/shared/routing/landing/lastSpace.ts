import type { SessionSpaceLink } from '@masaha/shared/space-links';
import type { SessionUser } from '@shared/session';
import { storage, STORAGE_KEYS } from '@shared/storage';

/**
 * Remembers the space the user opened last, for the landing. Storage that is unavailable remembers
 * nothing, and the landing falls back to the oldest link.
 */
export function rememberSpace(userId: number, spaceId: number): void {
  storage.write(STORAGE_KEYS.lastSpace(userId), String(spaceId));
}

/**
 * The user's active link at the space they opened last, or nothing: when none is remembered, when
 * the user no longer holds an active link there, or when storage is unavailable.
 */
export function lastSpace(user: SessionUser): SessionSpaceLink | undefined {
  const remembered = storage.read(STORAGE_KEYS.lastSpace(user.id));
  return user.spaces.find(({ spaceId }) => String(spaceId) === remembered);
}
