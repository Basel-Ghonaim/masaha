import { useCopy } from '@shared/copy';
import { useSession } from '@shared/session';
import { useMemo } from 'react';
import type { UserRowView } from '../../types/UserRowView';
import { useAdminUsersList } from './useAdminUsersList';

/**
 * The admin's users page, ready to render: the users list with its role chosen from the address, in
 * the users list's words, with its columns' names, the words of a person's spaces and front desks,
 * the line of an owner whose every space is deleted, and the signed-in admin's own id, whose row
 * reads «أنت» in place of its actions.
 */
export function useUsersList() {
  const words = useCopy().spaceLinks.usersList;
  const selfId = useSession((state) => (state.status === 'authenticated' ? state.user.id : null));
  // The table's columns change with these words, and new columns rebuild every row, a row's open
  // menu and the focus in it included: they stay the same object while the language does.
  const spacesWords = useMemo(
    () => ({ owned: words.owned, desk: words.desk, none: words.noSpaces }),
    [words],
  );

  return {
    ...useAdminUsersList({ words }),
    columns: words.columns,
    /** The line of an owner whose every space is deleted, which leads to the deleted spaces. */
    allSpacesDeleted: words.allSpacesDeleted,
    spacesWords,
    you: words.you,
    selfId,
    /** A card's line under the email: the role, how the account signs in, and when it joined. */
    cardLine: (row: UserRowView) =>
      words.cardLine({ role: row.role, signIn: row.signIn, joined: row.joined }),
  };
}

/** The admin's users list, ready to render. */
export type UsersListView = ReturnType<typeof useUsersList>;
