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
 * Asks before a photo is deleted (P5), «حذف هذه الصورة؟», its line saying it leaves the space's page
 * at once, and on the cover that the next photo becomes it; «حذف» is destructive and «رجوع» dismisses
 * it. It opens on «رجوع», so a stray Enter never deletes; Escape dismisses it. Either way the focus
 * goes back (`returnFocus`): to the photo's removal, or, once the photo is gone, to the gallery.
 */
export function PhotoRemoveDialog({
  dialog,
  returnFocus,
}: {
  dialog: PhotoRemoveDialogView;
  returnFocus: () => void;
}) {
  return (
    <AlertDialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) dialog.cancel();
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.failure && <FormFailure view={dialog.failure} />}
        <AlertDialogFooter>
          <AlertDialogCancel>{dialog.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              // Radix closes the dialog on this click; it closes on success only, so a failure shows.
              event.preventDefault();
              dialog.confirm();
            }}
          >
            {dialog.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
