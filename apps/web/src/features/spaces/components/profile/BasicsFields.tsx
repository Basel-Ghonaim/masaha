import { Field, Input, Textarea } from '@shared/design-system';
import type { ProfileFieldsView } from '../../types/ProfileFieldsView';
import { OptionalMark } from './OptionalMark';

/**
 * A space's basics: its names and descriptions, the Arabic at the start and the English beside it,
 * each written in its own language and direction. The section's frame is its form's.
 */
export function BasicsFields({ form }: { form: ProfileFieldsView }) {
  const { labels, errors, field } = form;
  const optional = <OptionalMark label={labels.optional} />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={labels.nameAr} labelEnd={optional} error={errors.nameAr}>
        <Input lang="ar" dir="rtl" autoComplete="off" {...field('nameAr')} />
      </Field>
      <Field label={labels.nameEn} error={errors.nameEn}>
        <Input lang="en" dir="ltr" autoComplete="off" {...field('nameEn')} />
      </Field>
      <Field label={labels.descriptionAr} labelEnd={optional} error={errors.descriptionAr}>
        <Textarea lang="ar" dir="rtl" rows={3} {...field('descriptionAr')} />
      </Field>
      <Field label={labels.descriptionEn} labelEnd={optional} error={errors.descriptionEn}>
        <Textarea lang="en" dir="ltr" rows={3} {...field('descriptionEn')} />
      </Field>
    </div>
  );
}
