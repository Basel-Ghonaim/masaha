import type { DeskVisit } from '@masaha/shared/visits';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { usePriceDialog } from '../../hooks/unpriced/usePriceDialog';

/**
 * «تحديد السعر» of an unpriced visit: «سعر يدوي», the amount, focused first, and its reason (DI-10).
 * While it is sent nothing closes it; a failure shows above the footer, every value kept. Closed,
 * `returnFocus` places the focus.
 */
export function PriceDialog({
  spaceId,
  visit,
  name,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  visit: DeskVisit;
  name: string;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = usePriceDialog({ spaceId, visit, name, onDone: onClose });

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
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <Badge variant="info" className="self-start">
            {dialog.badge}
          </Badge>
        </DialogHeader>
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          <Field label={dialog.amount.label} error={dialog.amount.error}>
            <Input
              dir="ltr"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              {...dialog.amount.field}
            />
          </Field>
          <Field label={dialog.reason.label} error={dialog.reason.error}>
            <Textarea {...dialog.reason.field} />
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
