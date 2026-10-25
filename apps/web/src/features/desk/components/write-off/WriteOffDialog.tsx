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
import { useWriteOffDialog } from '../../hooks/write-off/useWriteOffDialog';
import type { UncollectedItem } from '../../types/UncollectedItem';

/**
 * The owner's «لن يُحصَّل…»: it asks first, naming the visit and saying what the write-off is and is
 * not (DI-9), with its reason, focused first; «رجوع» cancels, and the action is destructive (DI-27).
 * While it is sent nothing closes it; a failure shows above the footer, the reason kept. Closed,
 * `returnFocus` places the focus — on the row's «⋯», else the card's heading (DI-30).
 */
export function WriteOffDialog({
  spaceId,
  item,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  item: UncollectedItem;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useWriteOffDialog({ spaceId, item, onDone: onClose });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !dialog.submit.busy) onClose();
      }}
    >
      <AlertDialogContent
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
            <Textarea autoFocus aria-required {...dialog.reason.field} />
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
