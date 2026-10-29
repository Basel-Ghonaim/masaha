import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { SpaceNameView } from '@shared/lib';
import { useReportDialog } from '../../hooks/report/useReportDialog';

/**
 * The report's dialog: who reads it, the field group (focused first), the details, the failure above
 * the footer, «رجوع» and «إرسال». While it is sent nothing closes it; a refusal keeps every value.
 * Closed, `returnFocus` places the focus.
 */
export function ReportDialog({
  slug,
  name,
  verified,
  openMyReports,
  onClose,
  returnFocus,
}: {
  slug: string;
  name: SpaceNameView;
  verified: boolean;
  openMyReports: () => void;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useReportDialog({ slug, name, verified, openMyReports, onDone: onClose });
  const { field, message, submit } = dialog;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submit.busy) onClose();
      }}
    >
      <DialogContent
        // The field group is what the user chooses first; Radix would focus the close button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.target instanceof HTMLElement)
            event.target.querySelector<HTMLElement>('[role="combobox"]')?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (submit.busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (submit.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>{dialog.description}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit.run} className="flex flex-col gap-4">
          <Field label={field.label} error={field.error}>
            <Select
              value={field.value === '' ? undefined : field.value}
              onValueChange={field.choose}
              disabled={submit.busy}
            >
              <SelectTrigger aria-required>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={message.label}
            helper={
              <>
                {message.optional !== null && <span className="block">{message.optional}</span>}
                <span className="block">{message.helper}</span>
              </>
            }
            error={message.error}
          >
            <Textarea dir="auto" aria-required={message.optional === null} {...message.field} />
          </Field>
          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submit.busy}>
                {dialog.back}
              </Button>
            </DialogClose>
            <Button type="submit" loading={submit.busy} disabled={submit.blocked}>
              {submit.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
