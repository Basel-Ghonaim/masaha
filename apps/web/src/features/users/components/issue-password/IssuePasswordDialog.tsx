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
import { useIssuePasswordDialog } from '../../hooks/issue-password/useIssuePasswordDialog';
import type { AccountPerson } from '../../types/AccountPerson';
import { recordAdminHandover } from '../../repository/adminHandover';
import { TemporaryPasswordDialog } from '../temporary-password/TemporaryPasswordDialog';

/**
 * Issues a temporary password after the admin confirms: the confirm opens on Back, its action
 * staying until the answer so a refusal shows inside (P8); while the issue is pending, neither Back
 * nor Escape closes it, since the server replaces the password whatever the dialog does, and the
 * new one must reach the admin. Issued, the one-time password dialog takes its place, with the
 * issued line and no way out but «تم». Closed, the focus returns to the control that opened it
 * (`returnFocus`).
 */
export function IssuePasswordDialog({
  person,
  onClose,
  returnFocus,
}: {
  person: AccountPerson;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const dialog = useIssuePasswordDialog(person, onClose);

  if (dialog.issued !== null) {
    return (
      <TemporaryPasswordDialog
        kind="issued"
        person={{ userId: person.id, name: person.name, email: person.email }}
        password={dialog.issued}
        returnFocus={returnFocus}
        recordHandover={recordAdminHandover}
        onDone={dialog.done}
      />
    );
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
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
          <AlertDialogDescription>{dialog.line}</AlertDialogDescription>
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
