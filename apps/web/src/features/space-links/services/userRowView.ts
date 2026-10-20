import type { AdminUserRow } from '@masaha/shared/space-links';
import type { Catalogue } from '@shared/copy';
import type { SpaceNameView } from '../types/AdminSpaceRowView';
import type { UserRowView } from '../types/UserRowView';
import { updatedOn } from './updatedOn';

/**
 * One row of the admin's users list in the interface's language. A space's English name is required
 * and its Arabic one optional, so the Arabic interface shows the English name when there is no other,
 * marked as English (docs/frontend/localisation.md › Content in two languages).
 *
 * Its role, how it signs in — a password, Google, or both — and when it joined, the lists' short
 * date.
 *
 * An owner with no space left in the row has only deleted ones: the role follows every active owner
 * link, a deleted space's included, while the list leaves a deleted space out (finding 50). A user
 * with none is only a user.
 */
export function userRowView(
  row: AdminUserRow,
  {
    words,
    english,
    now,
  }: { words: Catalogue['spaceLinks']['usersList']['row']; english: boolean; now: Date },
): UserRowView {
  const nameOf = (space: AdminUserRow['spaces'][number]): SpaceNameView => {
    const arabicName = english ? null : space.nameAr;
    return english || arabicName !== null
      ? { text: arabicName ?? space.nameEn }
      : { text: space.nameEn, lang: 'en', dir: 'ltr' };
  };

  return {
    id: row.id,
    row,
    name: row.name,
    email: row.email,
    role: words.roles[row.role],
    signIn:
      words.signIn[
        row.signIn.password && row.signIn.google
          ? 'both'
          : row.signIn.google
            ? 'google'
            : 'password'
      ],
    joined: updatedOn(row.joinedAt, english ? 'en' : 'ar', now),
    state: row.isSuspended
      ? { label: words.states.suspended, variant: 'neutral' }
      : { label: words.states.active, variant: 'success' },
    spaces: row.spaces.map(nameOf),
    receptionSpaces: row.receptionSpaces.map(nameOf),
    allSpacesDeleted: row.role === 'OWNER' && row.spaces.length === 0,
  };
}
