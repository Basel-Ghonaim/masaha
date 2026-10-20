import {
  Button,
  Field,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { AddStaffFormView } from '../../hooks/add/useAddStaffForm';

/**
 * The add sheet, open from the end: the name and the email, then what adding does, said before
 * «إنشاء حساب الاستقبال» at its foot. It is opened by the list's «إضافة موظف», and closes on
 * Escape, its close button or an account created.
 */
export function AddStaff({ form }: { form: AddStaffFormView }) {
  const { labels } = form;

  return (
    <Sheet open={form.open} onOpenChange={form.setOpen}>
      <SheetContent side="end" closeLabel={labels.close}>
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>
        <form noValidate onSubmit={form.submit.run} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex min-w-0 flex-col gap-4">
            <Field label={labels.name} error={form.errors.name}>
              <Input dir="auto" autoComplete="off" {...form.fields.name} />
            </Field>
            <Field label={labels.email} error={form.errors.email}>
              <Input type="email" dir="ltr" autoComplete="off" {...form.fields.email} />
            </Field>
            <p className="text-body-sm text-muted-foreground">{form.notice}</p>
            {form.failure !== null && <FormFailure view={form.failure} />}
          </SheetBody>
          <SheetFooter>
            <Button
              type="submit"
              className="w-full"
              loading={form.submit.isPending}
              disabled={form.submit.blocked}
            >
              {form.submit.label}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
