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
import { useReissueDialog } from '../../hooks/reissue/useReissueDialog';

/**
 * Asks before a staff member's temporary password is replaced: its title names them, its line says
 * the previous one ends, and their sessions with it. It opens on «رجوع»; «إصدار» stays until the
 * answer, so a refusal shows inside; while the request is pending, neither «رجوع» nor Escape closes
 * it, since the server replaces the password whatever the dialog does. Issued, it closes and the
 * new password goes to the one-time dialog (`issued`); refused or cancelled, the focus returns to
 * the row's menu button (`returnFocus`).
 */
export function ReissueDialog({
  spaceId,
  member,
  issued,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  member: StaffMember;
  issued: (password: string) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const dialog = useReissueDialog(spaceId, member, { issued, close: onClose });

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
