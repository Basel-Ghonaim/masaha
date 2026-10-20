import type { StaffMember } from '@masaha/shared/space-links';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { RefObject } from 'react';
import { useDeactivateDialog } from '../../hooks/access/useDeactivateDialog';

/**
 * Asks before a staff member's access is removed: its title names them, its line says every session
 * ends. It opens on «رجوع», so a stray Enter never removes it; its action is destructive and stays
 * until the answer, so a refusal shows inside (P8); while the request is pending, neither «رجوع» nor
 * Escape closes it. Closed, the focus returns to the row's menu button (`returnFocus`).
 */
export function DeactivateDialog({
  spaceId,
  member,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  member: StaffMember;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const dialog = useDeactivateDialog(spaceId, member, onClose);

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !dialog.confirm.busy) onClose();
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (dialog.confirm.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.failure !== null && <FormFailure view={dialog.failure} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={dialog.confirm.busy}>{dialog.cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            loading={dialog.confirm.busy}
            disabled={dialog.confirm.blocked}
            onClick={() => void dialog.confirm.run()}
          >
            {dialog.confirm.label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
