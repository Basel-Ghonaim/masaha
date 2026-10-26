import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { VisitDialogView } from '../../hooks/check-in/useVisitDialog';

/**
 * «تسجيل زيارة»: the visitor's name, focused first, «طالب» and «الوردية» where the space offers
 * them, the rate the visit will copy, and, while the space is full, that it may still be checked in.
 * Enter sends it; while it is sent the fields wait, and a failure shows above the footer, every value
 * kept. Closed, the focus returns to what opened it, or to the search after a check-in from it.
 */
export function VisitDialog({ dialog }: { dialog: VisitDialogView }) {
  const { name, student, shift } = dialog.fields;

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (dialog.submit.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          const target = dialog.focusAfter();
          if (target !== null) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>{dialog.noRecord}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          <Field label={name.label} error={name.error}>
            <Input dir="auto" autoComplete="off" autoFocus {...name.field} />
          </Field>
          {student !== null && (
            <Field label={student.label} orientation="horizontal">
              <Checkbox
                checked={student.checked}
                onCheckedChange={(checked) => {
                  student.change(checked === true);
                }}
                disabled={dialog.submit.busy}
              />
            </Field>
          )}
          {shift !== null && (
            <Field label={shift.label} helper={shift.optional}>
              <Select
                value={shift.value}
                onValueChange={shift.change}
                disabled={dialog.submit.busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shift.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {dialog.rate !== '' && (
            <p className="text-body-sm text-muted-foreground">{dialog.rate}</p>
          )}
          {dialog.full !== null && (
            <Alert variant="warning">
              <AlertDescription>{dialog.full}</AlertDescription>
            </Alert>
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
