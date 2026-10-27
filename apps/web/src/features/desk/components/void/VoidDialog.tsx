import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useVoidDialog } from '../../hooks/void/useVoidDialog';
import type { VoidTarget } from '../../types/VoidTarget';

/**
 * The owner's «إلغاء الدفعة…» (DI-7): it asks first, naming the payment and saying the void's true
 * consequence, with its reason, focused first; «رجوع» cancels, and the action is destructive. While it
 * is sent nothing closes it; a failure shows above the footer, the reason kept. Closed, `returnFocus`
 * places the focus (DI-8).
 */
export function VoidDialog({
  spaceId,
  payment,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  payment: VoidTarget;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useVoidDialog({ spaceId, payment, onDone: onClose });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !dialog.submit.busy) onClose();
      }}
    >
      <AlertDialogContent
        // An alert dialog focuses «رجوع» first; the reason is what the owner types first (DI-7).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.target instanceof HTMLElement) event.target.querySelector('textarea')?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (dialog.submit.busy) event.preventDefault();
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
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          <Field label={dialog.reason.label} error={dialog.reason.error}>
            <Textarea aria-required {...dialog.reason.field} />
          </Field>
          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dialog.submit.busy}>{dialog.back}</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              loading={dialog.submit.busy}
              disabled={dialog.submit.blocked}
            >
              {dialog.submit.label}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
