import { Button, Field, Input, XIcon } from '@shared/design-system';
import { useShiftsSheet } from '../../hooks/shifts/useShiftsSheet';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { TimeSelect } from '../hours/TimeSelect';
import { OptionalMark } from '../profile/OptionalMark';

/**
 * «الورديات»'s Sheet (S3, X1): a block per shift — its two names, «من» and «إلى», its removal, or why
 * it cannot be removed — then «إضافة وردية», its limit said beside it once reached.
 */
export function ShiftsSheet({
  host,
  packageShifts,
}: {
  host: SectionHost;
  packageShifts: readonly number[];
}) {
  const view = useShiftsSheet(host, packageShifts);
  return (
    <EditSheet frame={view.frame}>
      <p className="text-body-sm text-muted-foreground">{view.hint}</p>
      <ul className="flex flex-col gap-3">
        {view.rows.map((row) => (
          <li key={row.key}>
            <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <legend className="sr-only">{row.legend}</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={row.nameAr.label} error={row.nameAr.error}>
                  <Input
                    lang="ar"
                    dir="rtl"
                    autoComplete="off"
                    placeholder={row.nameAr.placeholder}
                    {...row.nameAr.binding}
                  />
                </Field>
                <Field
                  label={row.nameEn.label}
                  labelEnd={<OptionalMark label={row.nameEn.optional} />}
                  error={row.nameEn.error}
                >
                  <Input
                    lang="en"
                    dir="ltr"
                    autoComplete="off"
                    placeholder={row.nameEn.placeholder}
                    {...row.nameEn.binding}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TimeSelect time={row.starts} />
                <div className="flex flex-col gap-1">
                  <TimeSelect time={row.ends.time} error={row.ends.error} />
                  {row.ends.helper && !row.ends.error && (
                    <p className="text-caption text-muted-foreground">{row.ends.helper}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {row.remove.reason && (
                  <p className="text-caption text-muted-foreground">{row.remove.reason}</p>
                )}
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
            </fieldset>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={view.add.disabled} onClick={view.add.run}>
          {view.add.label}
        </Button>
        {view.add.reason && (
          <span className="text-caption text-muted-foreground">{view.add.reason}</span>
        )}
      </div>
    </EditSheet>
  );
}
