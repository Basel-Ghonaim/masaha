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
import type { EndDialogView } from '../../hooks/end/useEndDialog';

/**
 * «إنهاء الاشتراك اليوم؟»: the subscription and the end it will take, and that the amounts do not
 * change; «رجوع», focused first, cancels, and «إنهاء الاشتراك» is destructive. While it is sent
 * nothing closes it; a failure shows above the footer.
 */
export function EndDialog({ dialog }: { dialog: EndDialogView['dialog'] }) {
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
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
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
