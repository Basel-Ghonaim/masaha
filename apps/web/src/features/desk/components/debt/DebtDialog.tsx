import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useDebtDialog } from '../../hooks/debt/useDebtDialog';
import type { UncollectedItem } from '../../types/UncollectedItem';

/**
 * «تسجيل دين» of an uncollected visit: what follows, then the name, focused first (DI-17), and the
 * phone. While it is sent nothing closes it; a failure shows above the footer, every value kept.
 * Closed, `returnFocus` places the focus.
 */
export function DebtDialog({
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
  const dialog = useDebtDialog({ spaceId, item, onDone: onClose });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !dialog.submit.busy) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (dialog.submit.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>{dialog.text}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          <Field label={dialog.name.label} error={dialog.name.error}>
            <Input dir="auto" autoComplete="off" autoFocus {...dialog.name.field} />
          </Field>
          <Field label={dialog.phone.label} error={dialog.phone.error}>
            <Input type="tel" dir="ltr" autoComplete="off" aria-required {...dialog.phone.field} />
          </Field>
          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
          <DialogFooter>
            <Button type="submit" loading={dialog.submit.busy} disabled={dialog.submit.blocked}>
              {dialog.submit.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
