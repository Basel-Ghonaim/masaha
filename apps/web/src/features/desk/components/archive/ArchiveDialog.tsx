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
import type { ArchiveFlowView } from '../../hooks/archive/useArchiveFlow';

/**
 * The question before archiving a customer who owes (DK-014): named by them, describing the debt
 * and what the archive keeps; «رجوع», focused first, cancels, and «أرشفة رغم الدين» is destructive
 * (DI-46). While it is sent nothing closes it; a failure shows above the footer. Closed, the focus
 * goes where `returnFocus` says, else back to what opened it.
 */
export function ArchiveDialog({
  dialog,
  returnFocus,
}: {
  dialog: ArchiveFlowView['dialog'];
  returnFocus?: () => HTMLElement | null;
}) {
  return (
    <AlertDialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) dialog.close();
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (dialog.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus?.() ?? null;
          if (target !== null) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle dir="auto">{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{dialog.text}</AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.failure !== null && <FormFailure view={dialog.failure} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={dialog.busy}>{dialog.back}</AlertDialogCancel>
          <Button variant="destructive" loading={dialog.busy} onClick={dialog.run}>
            {dialog.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
