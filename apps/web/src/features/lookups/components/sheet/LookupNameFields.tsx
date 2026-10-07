import { Field, Input } from '@shared/design-system';
import type { LookupFormView } from '../../types/LookupFormView';

/**
 * A lookup's two names in its sheet, Arabic then English, each typed in its own language and
 * direction, with its label and error.
 */
export function LookupNameFields({
  form,
}: {
  form: Pick<LookupFormView, 'field' | 'errors' | 'labels'>;
}) {
  return (
    <>
      <Field label={form.labels.nameAr} error={form.errors.nameAr}>
        <Input lang="ar" dir="rtl" autoComplete="off" {...form.field('nameAr')} />
      </Field>
      <Field label={form.labels.nameEn} error={form.errors.nameEn}>
        <Input lang="en" dir="ltr" autoComplete="off" {...form.field('nameEn')} />
      </Field>
    </>
  );
}
