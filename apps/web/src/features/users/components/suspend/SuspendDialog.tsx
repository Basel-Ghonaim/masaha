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
import { useSuspendDialog } from '../../hooks/suspend/useSuspendDialog';
import type { AccountPerson } from '../../types/AccountPerson';

/**
 * Asks before an account is suspended: its title names the person, its lines say what follows, each
 * its own paragraph. It opens on Back, so a stray Enter never suspends; its action is destructive
 * and stays until the answer, so a refusal shows inside (P8); while the request is pending, neither
 * Back nor Escape closes it, so its answer is never lost. Closed, the focus returns to the control
 * that opened it (`returnFocus`).
 */
export function SuspendDialog({
  person,
  onClose,
  returnFocus,
}: {
  person: AccountPerson;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const dialog = useSuspendDialog(person, onClose);

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
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              {dialog.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </AlertDialogDescription>
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
