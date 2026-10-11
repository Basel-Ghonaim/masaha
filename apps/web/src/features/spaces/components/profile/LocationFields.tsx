import { Field, Input } from '@shared/design-system';
import { PointPicker } from '@shared/map';
import type { AreaField } from '../../types/AreaField';
import type { ProfileFieldsView } from '../../types/ProfileFieldsView';
import { OptionalMark } from './OptionalMark';

/**
 * A space's location: its area, from the field the page hands in (`areaField`), its addresses and
 * landmarks in both languages, then its pin on the map with the pin's coordinates, the keyboard's
 * way to place it and the way when the map cannot load. The section's frame is its form's.
 */
export function LocationFields({
  form,
  areaField,
}: {
  form: ProfileFieldsView;
  areaField: AreaField;
}) {
  const { labels, errors, field } = form;
  const optional = <OptionalMark label={labels.optional} />;

  return (
    <div className="flex flex-col gap-4">
      {/* The area takes the grid's first column, in line with the Arabic address under it. */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={labels.area} error={errors.areaId}>
          {areaField(form.area)}
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={labels.addressAr} error={errors.addressAr}>
          <Input lang="ar" dir="rtl" autoComplete="off" {...field('addressAr')} />
        </Field>
        <Field label={labels.addressEn} labelEnd={optional} error={errors.addressEn}>
          <Input lang="en" dir="ltr" autoComplete="off" {...field('addressEn')} />
        </Field>
        <Field label={labels.landmarkAr} labelEnd={optional} error={errors.landmarkAr}>
          <Input lang="ar" dir="rtl" autoComplete="off" {...field('landmarkAr')} />
        </Field>
        <Field label={labels.landmarkEn} labelEnd={optional} error={errors.landmarkEn}>
          <Input lang="en" dir="ltr" autoComplete="off" {...field('landmarkEn')} />
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label text-foreground">{labels.pin}</p>
        <PointPicker {...form.map} />
        <p className="text-caption text-muted-foreground">{labels.pinHint}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={labels.coordinates} helper={labels.coordinatesHint} error={errors.location}>
          <Input dir="ltr" autoComplete="off" spellCheck={false} {...field('location')} />
        </Field>
      </div>
    </div>
  );
}
