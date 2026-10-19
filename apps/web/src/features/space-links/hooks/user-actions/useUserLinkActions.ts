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

/**
 * A person's row actions on the users page that read their links, ready for the page's menu: the
 * menu's button, named after the person, and «ربط بمساحة», which opens the link dialog from the
 * person — held, its reason said, for an admin, who is never linked, and for a suspended account.
 * The dialog chosen is opened where the page holds it (`open`, from `useUserLinkDialog`), so it
 * outlives the closed menu and the row.
 */
export function useUserLinkActions(
  row: AdminUserRow,
  { open }: { open: (dialog: UserLinkDialogState) => void },
) {
  const lines = useCopy().spaceLinks.userActions;
  const role = row.role;

  const link: UserActionItem =
    role === 'ADMIN'
      ? { label: lines.link, disabled: true, reason: lines.isAdmin, run: () => undefined }
      : row.isSuspended
        ? { label: lines.link, disabled: true, reason: lines.suspended, run: () => undefined }
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
    link,
  };
}
