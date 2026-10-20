import type { AdminUserRow } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import type { UserLinkDialogState } from './useUserLinkDialog';

/** One item of a person's menu: its label, and why it is held when it is. */
export type UserActionItem = {
  label: string;
  disabled: boolean;
  /** Why the item is held, said under it (foundation §10). */
  reason?: string;
  run: () => void;
};

/** A held item's way out: a page where what holds it is undone. */
export type UserActionLead = { label: string; to: string };

const held = (label: string, reason: string): UserActionItem => ({
  label,
  disabled: true,
  reason,
  run: () => undefined,
});

/**
 * A person's row actions on the users page that read their links, ready for the page's menu: the
 * menu's button, named after the person; «تغيير الدور», which a user with no link and an admin
 * take, held, its reason said, for every case the row can see — an owner, whose role follows their
 * links (leading to their links on the owners page, `ownersLink`), an owner whose every space is
 * deleted (leading to the deleted spaces, `deletedSpacesLink`), and a receptionist; and «ربط
 * بمساحة», which opens the link dialog from the person, held for an admin, who is never linked, and
 * for a suspended account. The dialog chosen is opened where the page holds it (`open`, from
 * `useUserLinkDialog`), so it outlives the closed menu and the row.
 */
export function useUserLinkActions(
  row: AdminUserRow,
  {
    ownersLink,
    deletedSpacesLink,
    open,
  }: {
    ownersLink: string;
    deletedSpacesLink: string;
    open: (dialog: UserLinkDialogState) => void;
  },
) {
  const copy = useCopy();
  const lines = copy.spaceLinks.userActions;
  const role = row.role;

  const roleItem: UserActionItem & { lead?: UserActionLead } =
    role === 'OWNER'
      ? row.spaces.length > 0
        ? {
            ...held(lines.changeRole, lines.roleFollowsLinks),
            lead: { label: lines.unlinkThem, to: ownersLink },
          }
        : {
            ...held(lines.changeRole, copy.spaceLinks.usersList.allSpacesDeleted),
            lead: { label: lines.deletedSpaces, to: deletedSpacesLink },
          }
      : role === 'USER' && row.receptionSpaces.length > 0
        ? held(lines.changeRole, lines.atDesk)
        : {
            label: lines.changeRole,
            disabled: false,
            run: () => {
              open({
                kind: 'role',
                personId: row.id,
                person: { id: row.id, name: row.name, role },
              });
            },
          };

  const link: UserActionItem =
    role === 'ADMIN'
      ? held(lines.link, lines.isAdmin)
      : row.isSuspended
        ? held(lines.link, lines.suspended)
        : {
            label: lines.link,
            disabled: false,
            run: () => {
              open({
                kind: 'link',
                personId: row.id,
                target: {
                  from: 'person',
                  person: {
                    id: row.id,
                    name: row.name,
                    role,
                    spaceIds: row.spaces.map((space) => space.id),
                    deskIds: row.receptionSpaces.map((desk) => desk.id),
                  },
                },
              });
            },
          };

  return {
    // An accessible name is one string, so the name in it is isolated rather than marked.
    trigger: { label: lines.menu({ name: isolate(row.name) }) },
    role: roleItem,
    link,
  };
}
