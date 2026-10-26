import type { Customer } from '@masaha/shared/customers';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useEditDialog } from '../../hooks/edit/useEditDialog';

/**
 * «تعديل البيانات»: the name, focused first, in its own direction, and the phone, left to right,
 * optional, with why it is asked. Enter saves; while it is sent nothing closes it; a failure shows
 * above the footer, every value kept, and «لم يتغيّر شيء» when nothing differs. Closed, the focus
 * returns to what opened it, or where `returnFocus` says.
 */
export function EditCustomerDialog({
  spaceId,
  customer,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  customer: Customer;
  onClose: () => void;
  returnFocus?: () => HTMLElement | null;
}) {
  const dialog = useEditDialog({ spaceId, customer, onDone: onClose });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !dialog.submit.busy) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (dialog.submit.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus?.() ?? null;
          if (target !== null) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          <Field label={dialog.name.label} error={dialog.name.error}>
            <Input dir="auto" autoComplete="off" autoFocus aria-required {...dialog.name.field} />
          </Field>
          <Field
            label={dialog.phone.label}
            labelEnd={
              <span className="text-caption text-muted-foreground">{dialog.phone.optional}</span>
            }
            helper={dialog.phone.help}
            error={dialog.phone.error}
          >
            <Input type="tel" dir="ltr" autoComplete="off" {...dialog.phone.field} />
          </Field>
          {dialog.unchanged !== null && (
            <p role="status" className="text-body-sm text-muted-foreground">
              {dialog.unchanged}
            </p>
          )}
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
