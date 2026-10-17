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
import { FormFailure } from '@shared/forms';
import type { PhotoRemoveDialogView } from '../../types/PhotoGalleryView';

/**
 * Asks before a photo is deleted: its title names the photo, its line says that it leaves the space's
 * page at once. It opens on Cancel, so a stray Enter never deletes; Escape cancels, and either way
 * the focus returns to the button that opened it.
 */
export function PhotoRemoveDialog({ dialog }: { dialog: PhotoRemoveDialogView }) {
  return (
    <AlertDialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) dialog.cancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.failure && <FormFailure view={dialog.failure} />}
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
