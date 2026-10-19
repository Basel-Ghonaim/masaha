import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Skeleton,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { RefObject } from 'react';
import { useUnlinkOwnerDialog, type UnlinkSubject } from '../../hooks/unlink/useUnlinkOwnerDialog';
import { NamedLine } from '../NamedLine';

/**
 * Asks before an owner is unlinked from a space: its title names both, its line says what follows,
 * read from the space's owners as it opens. It opens on Back, so a stray Enter never unlinks; its
 * action is destructive and stays until the answer, so a refusal shows inside (P8). Closed, the focus
 * returns to the control that opened it (`returnFocus`).
 */
export function UnlinkOwnerDialog({
  space,
  owner,
  onClose,
  returnFocus,
}: UnlinkSubject & { onClose: () => void; returnFocus: RefObject<HTMLElement | null> }) {
  const dialog = useUnlinkOwnerDialog({ space, owner }, onClose);

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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
          {/* A block, so the line's placeholder can stand in it while the owners are read. */}
          <AlertDialogDescription asChild>
            <div>
              {dialog.consequence === null ? (
                <Skeleton className="h-4 w-3/4" />
              ) : typeof dialog.consequence === 'string' ? (
                dialog.consequence
              ) : (
                <NamedLine line={dialog.consequence} />
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.failure !== null && <FormFailure view={dialog.failure} />}
        <AlertDialogFooter>
          <AlertDialogCancel>{dialog.cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            loading={dialog.confirm.busy}
            disabled={dialog.confirm.disabled}
            onClick={() => void dialog.confirm.run()}
          >
            {dialog.confirm.label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
