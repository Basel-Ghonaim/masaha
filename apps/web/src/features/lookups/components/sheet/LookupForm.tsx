import { Button, Field, Input, SheetBody, SheetFooter, Switch } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { LookupFormView } from '../../types/LookupFormView';

/**
 * A governorate's or an area's form, inside its sheet: the failure, the Arabic and English names,
 * the Active switch when editing, and Save at the sheet's foot.
 */
export function LookupForm({ form }: { form: LookupFormView }) {
  return (
    <form noValidate onSubmit={form.submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="flex flex-col gap-4">
        {form.failure && <FormFailure view={form.failure} />}
        <Field label={form.labels.nameAr} error={form.errors.nameAr}>
          <Input lang="ar" dir="rtl" autoComplete="off" {...form.field('nameAr')} />
        </Field>
        <Field label={form.labels.nameEn} error={form.errors.nameEn}>
          <Input lang="en" dir="ltr" autoComplete="off" {...form.field('nameEn')} />
        </Field>
        {form.active && (
          <Field orientation="horizontal" label={form.active.label} helper={form.active.hint}>
            <Switch
              checked={form.active.checked}
              disabled={form.active.disabled}
              onCheckedChange={form.active.toggle}
            />
          </Field>
        )}
      </SheetBody>
      <SheetFooter>
        <Button type="submit" loading={form.isPending} disabled={form.blocked}>
          {form.labels.save}
        </Button>
      </SheetFooter>
    </form>
  );
}
