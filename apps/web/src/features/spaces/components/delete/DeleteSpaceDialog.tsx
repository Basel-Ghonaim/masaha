import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/design-system';
import type { RefObject } from 'react';
import type { useSpaceActionsMenu } from '../../hooks/menu/useSpaceActionsMenu';
import { NamedLine } from '../toast/NamedLine';

/**
 * Asks before a space is deleted: its title names the space, its line says what follows. It opens on
 * Cancel, so a stray Enter never deletes; Escape cancels. Either way, the focus returns to the row's
 * menu button (`returnFocus`), which the menu that opened it has already left.
 */
export function DeleteSpaceDialog({
  dialog,
  returnFocus,
}: {
  dialog: ReturnType<typeof useSpaceActionsMenu>['dialog'];
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <AlertDialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <NamedLine line={dialog.title} />
          </AlertDialogTitle>
          <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dialog.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={dialog.confirm}>
            {dialog.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
