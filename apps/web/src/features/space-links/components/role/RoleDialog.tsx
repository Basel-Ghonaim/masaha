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
import { useRoleDialog, type RolePerson } from '../../hooks/role/useRoleDialog';

/**
 * Asks before a person's role changes: its title names them, its line says what follows. It opens
 * on Back, so a stray Enter never changes a role; its action is destructive and stays until the
 * answer, so a refusal shows inside (P8); while the request is pending, neither Back nor Escape
 * closes it, so its answer is never lost. Closed, the focus returns to the control that opened it
 * (`returnFocus`).
 */
export function RoleDialog({
  person,
  onClose,
  returnFocus,
}: {
  person: RolePerson;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const dialog = useRoleDialog(person, onClose);

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
