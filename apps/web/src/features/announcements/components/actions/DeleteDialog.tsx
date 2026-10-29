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
import { useDeleteDialog } from '../../hooks/actions/useDeleteDialog';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';

/**
 * «حذف…» (DI-18): it asks first, naming the announcement and saying the true consequence; «رجوع»
 * cancels, and the action is destructive. While it is sent nothing closes it; a failure shows above
 * the footer. Closed, `returnFocus` places the focus.
 */
export function DeleteDialog({
  spaceId,
  card,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  card: AnnouncementCardView;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useDeleteDialog({ spaceId, card, onDone: onClose });
  const busy = dialog.confirm.busy;

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{dialog.text}</AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.failure !== null && <FormFailure view={dialog.failure} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{dialog.back}</AlertDialogCancel>
          <Button variant="destructive" loading={busy} onClick={dialog.confirm.run}>
            {dialog.confirm.label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
