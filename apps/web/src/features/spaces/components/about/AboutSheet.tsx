import { Field, Input, Textarea, cn } from '@shared/design-system';
import { useCopy } from '@shared/copy';
import { useProfileSheet } from '../../hooks/profile/useProfileSheet';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { OptionalMark } from '../profile/OptionalMark';

/**
 * «عن المساحة»'s Sheet (B2): the two names side by side, «مطلوب» on the English with the line that the
 * page's link stays, then the two descriptions, each with its live count; each field in its own
 * language and direction.
 */
export function AboutSheet({ host }: { host: SectionHost }) {
  const copy = useCopy();
  const words = copy.spaces.editor;
  const { frame, fields, counts } = useProfileSheet(host, 'about');
  const { field, errors } = fields;
  const optional = <OptionalMark label={words.section.optional} />;
  const count = (counted: { text: string; over: boolean }) => (
    <span dir="ltr" className={cn(counted.over && 'text-destructive')}>
      {counted.text}
    </span>
  );

  return (
    <EditSheet frame={frame}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={words.about.nameAr} labelEnd={optional} error={errors.nameAr}>
          <Input lang="ar" dir="rtl" autoComplete="off" {...field('nameAr')} />
        </Field>
        <Field
          label={words.about.nameEn}
          labelEnd={<span className="text-caption text-foreground">{words.section.required}</span>}
          helper={words.about.slugNote}
          error={errors.nameEn}
        >
          <Input lang="en" dir="ltr" autoComplete="off" {...field('nameEn')} />
        </Field>
      </div>
      <Field
        label={words.about.descriptionAr}
        labelEnd={optional}
        helper={count(counts.descriptionAr)}
        error={errors.descriptionAr}
      >
        <Textarea lang="ar" dir="rtl" rows={6} {...field('descriptionAr')} />
      </Field>
      <Field
        label={words.about.descriptionEn}
        labelEnd={optional}
        helper={count(counts.descriptionEn)}
        error={errors.descriptionEn}
      >
        <Textarea lang="en" dir="ltr" rows={6} {...field('descriptionEn')} />
      </Field>
    </EditSheet>
  );
}
