import { Button, Field, Input, LocateFixedIcon } from '@shared/design-system';
import { PointPicker } from '@shared/map';
import { useCopy } from '@shared/copy';
import { useCurrentPosition } from '../../hooks/location/useCurrentPosition';
import { useProfileSheet } from '../../hooks/profile/useProfileSheet';
import type { AreaField } from '../../types/AreaField';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { OptionalMark } from '../profile/OptionalMark';

/**
 * «الموقع»'s Sheet (L2): the area, searched in the field the page hands in (`areaField`); the
 * addresses and the landmarks, the two languages side by side; a large map, the pin placed by a tap
 * and moved by a drag, with «استخدم موقعي الحالي»; and the pin's coordinates, the keyboard's way. A
 * pin outside the Strip is refused on the coordinates.
 */
export function LocationSheet({ host, areaField }: { host: SectionHost; areaField: AreaField }) {
  const copy = useCopy();
  const words = copy.spaces.editor.location;
  const { frame, fields } = useProfileSheet(host, 'location');
  const { field, errors } = fields;
  const here = useCurrentPosition((point) => {
    fields.map.onChange(point);
  });
  const optional = <OptionalMark label={copy.spaces.editor.section.optional} />;

  return (
    <EditSheet frame={frame}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={words.area} error={errors.areaId}>
          {areaField(fields.area)}
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={words.addressAr} error={errors.addressAr}>
          <Input lang="ar" dir="rtl" autoComplete="off" {...field('addressAr')} />
        </Field>
        <Field label={words.addressEn} labelEnd={optional} error={errors.addressEn}>
          <Input lang="en" dir="ltr" autoComplete="off" {...field('addressEn')} />
        </Field>
        <Field label={words.landmarkAr} labelEnd={optional} error={errors.landmarkAr}>
          <Input lang="ar" dir="rtl" autoComplete="off" {...field('landmarkAr')} />
        </Field>
        <Field label={words.landmarkEn} labelEnd={optional} error={errors.landmarkEn}>
          <Input lang="en" dir="ltr" autoComplete="off" {...field('landmarkEn')} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label text-foreground">{words.pin}</p>
          {here && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={here.pending}
              onClick={here.run}
            >
              <LocateFixedIcon aria-hidden />
              {here.label}
            </Button>
          )}
        </div>
        {here?.failed && (
          <p role="status" className="text-body-sm text-destructive">
            {here.failed}
          </p>
        )}
        <PointPicker
          {...fields.map}
          onChange={(point) => {
            here?.reset();
            fields.map.onChange(point);
          }}
          label={words.map}
        />
        <p className="text-caption text-muted-foreground">{words.pinHint}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={words.coordinates}
          helper={fields.labels.coordinatesHint}
          error={errors.location ?? here?.outside ?? undefined}
        >
          <Input dir="ltr" autoComplete="off" spellCheck={false} {...field('location')} />
        </Field>
      </div>
    </EditSheet>
  );
}
