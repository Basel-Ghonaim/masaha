import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { Button, Field, Input, Separator, XIcon } from '@shared/design-system';
import { Link } from 'react-router';
import { useAmenitiesSection } from '../../hooks/amenities/useAmenitiesSection';
import type { AmenitiesField } from '../../types/AmenitiesField';
import { SectionCard } from '../editor/SectionCard';
import { OptionalMark } from '../profile/OptionalMark';

/**
 * «المرافق»: the platform's amenities to tick (`amenitiesField`), with the way to the list itself
 * (`listLink`), then «مرافق إضافية», the space's own, a row each, added up to the limit and removed;
 * one form, saved, dated and confirmed as one group.
 */
export function AmenitiesSection({
  space,
  amenitiesField,
  listLink,
  onDirtyChange,
}: {
  space: AdminSpace;
  amenitiesField: AmenitiesField;
  listLink: string;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const view = useAmenitiesSection({ space, onDirtyChange });
  const { own } = view;

  return (
    <SectionCard frame={view.frame}>
      {amenitiesField(view.checklist)}
      <p className="text-body-sm text-muted-foreground">
        {view.manage.lead}{' '}
        <Link to={listLink} className="text-primary underline underline-offset-4">
          {view.manage.label}
        </Link>
      </p>
      <Separator />
      <section aria-labelledby="own-amenities-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="own-amenities-title" className="text-label">
            {own.title}
          </h3>
          <p className="text-body-sm text-muted-foreground">{own.hint}</p>
        </div>
        {own.rows.length > 0 && (
          <ul className="flex flex-col gap-4">
            {own.rows.map((row) => (
              <li key={row.key} className="grid gap-2 md:grid-cols-12 md:items-start">
                <Field label={row.nameAr.label} error={row.nameAr.error} className="md:col-span-6">
                  <Input lang="ar" dir="rtl" autoComplete="off" {...row.nameAr.binding} />
                </Field>
                <Field
                  label={row.nameEn.label}
                  labelEnd={<OptionalMark label={row.nameEn.optional} />}
                  error={row.nameEn.error}
                  className="md:col-span-5"
                >
                  <Input lang="en" dir="ltr" autoComplete="off" {...row.nameEn.binding} />
                </Field>
                <div className="md:col-span-1 md:flex md:justify-end md:pt-7">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={row.remove.label}
                    disabled={row.remove.disabled}
                    onClick={row.remove.run}
                  >
                    <XIcon aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={own.add.disabled} onClick={own.add.run}>
            {own.add.label}
          </Button>
          {own.add.reason && (
            <span className="text-caption text-muted-foreground">{own.add.reason}</span>
          )}
        </div>
      </section>
    </SectionCard>
  );
}
