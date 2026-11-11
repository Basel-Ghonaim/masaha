import { Button, Field, Input, XIcon } from '@shared/design-system';
import { useAmenitiesSheet } from '../../hooks/amenities/useAmenitiesSheet';
import type { AmenitiesField } from '../../types/AmenitiesField';
import type { AmenityCatalogue } from '../../types/AmenityCatalogue';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { OptionalMark } from '../profile/OptionalMark';

/**
 * «المرافق»'s Sheet (A2): the platform's checklist (`amenitiesField`), the way to its list on the
 * admin's page (`listLink`), then «مرافق أخرى», a row each, added up to the limit and removed.
 */
export function AmenitiesSheet({
  host,
  amenitiesField,
  catalogue,
  listLink,
}: {
  host: SectionHost;
  amenitiesField: AmenitiesField;
  catalogue: AmenityCatalogue;
  listLink: string | null;
}) {
  const view = useAmenitiesSheet(host, catalogue, listLink);
  const { own } = view;
  return (
    <EditSheet frame={view.frame}>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label">{view.checklist.label}</legend>
        {amenitiesField(view.checklist)}
        {view.manage && (
          <p className="text-body-sm text-muted-foreground">
            {view.manage.lead}{' '}
            <a
              href={view.manage.href}
              className="text-primary underline underline-offset-4"
              onClick={(event) => {
                event.preventDefault();
                view.manage?.run();
              }}
            >
              {view.manage.label}
            </a>
          </p>
        )}
      </fieldset>
      <section aria-labelledby="own-amenities-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="own-amenities-title" className="text-label">
            {own.title}
          </h3>
          <p className="text-body-sm text-muted-foreground">{own.hint}</p>
        </div>
        {own.rows.length > 0 && (
          <ul className="flex flex-col gap-3">
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
                <div className="flex justify-end md:col-span-1 md:pt-7">
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
    </EditSheet>
  );
}
