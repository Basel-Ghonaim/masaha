import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { Button, Field, Input, Separator, Switch, XIcon } from '@shared/design-system';
import { useHoursSection } from '../../hooks/hours/useHoursSection';
import { SectionCard } from '../editor/SectionCard';
import { OptionalMark } from '../profile/OptionalMark';

/** A time typed as text: 24-hour, Western digits, left to right in both languages. */
function TimeInput({
  field,
}: {
  field: ReturnType<typeof useHoursSection>['days'][number]['opens'];
}) {
  if (field === null) return null;
  return (
    <Field label={field.label} error={field.error} helper={field.helper}>
      <Input
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        placeholder={field.placeholder}
        className="md:w-28"
        {...field.binding}
      />
    </Field>
  );
}

/**
 * «ساعات العمل»: the week, Saturday first, each day open or closed by its switch with its two times
 * side by side, the copy of the first open day's hours in the header, and the shifts, each its names
 * and its two times, added up to the limit and removed unless a price uses it; saved, dated and
 * confirmed as one group.
 */
export function HoursSection({
  space,
  onDirtyChange,
}: {
  space: AdminSpace;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const view = useHoursSection({ space, onDirtyChange });

  return (
    <SectionCard
      frame={view.frame}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={view.copyAll.disabled}
          onClick={view.copyAll.run}
        >
          {view.copyAll.label}
        </Button>
      }
    >
      <p className="text-caption text-muted-foreground">{view.hint}</p>
      <ul className="divide-y divide-border rounded-lg border">
        {view.days.map((day) => (
          <li key={day.key} className="flex flex-col gap-3 p-3 md:flex-row md:items-end md:gap-6">
            <div className="flex items-center justify-between gap-3 md:w-44 md:self-center">
              <span className="text-label">{day.name}</span>
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-caption text-muted-foreground">
                  {day.state}
                </span>
                <Switch
                  aria-label={day.toggle.label}
                  checked={day.toggle.checked}
                  onCheckedChange={day.toggle.run}
                  disabled={day.toggle.disabled}
                />
              </span>
            </div>
            {day.opens && day.closes && (
              <div className="grid grid-cols-2 gap-3">
                <TimeInput field={day.opens} />
                <TimeInput field={day.closes} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <Separator />
      <section aria-labelledby="shifts-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="shifts-title" className="text-label">
            {view.shifts.title}
          </h3>
          <p className="text-caption text-muted-foreground">{view.shifts.hint}</p>
        </div>
        {view.shifts.rows.length > 0 && (
          <ul className="flex flex-col gap-4">
            {view.shifts.rows.map((row) => (
              <li
                key={row.key}
                role="group"
                aria-label={row.label}
                className="flex flex-col gap-4 rounded-lg border p-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={row.nameAr.label} error={row.nameAr.error}>
                    <Input dir="rtl" autoComplete="off" {...row.nameAr.binding} />
                  </Field>
                  <Field
                    label={row.nameEn.label}
                    labelEnd={<OptionalMark label={row.nameEn.optional} />}
                    error={row.nameEn.error}
                  >
                    <Input dir="ltr" autoComplete="off" {...row.nameEn.binding} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TimeInput field={row.starts} />
                  <TimeInput field={row.ends} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={row.remove.label}
                    disabled={row.remove.disabled}
                    onClick={row.remove.run}
                  >
                    <XIcon aria-hidden />
                    {row.remove.text}
                  </Button>
                  {row.remove.reason && (
                    <span className="text-caption text-muted-foreground">{row.remove.reason}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={view.shifts.add.disabled}
            onClick={view.shifts.add.run}
          >
            {view.shifts.add.label}
          </Button>
          {view.shifts.add.reason && (
            <span className="text-caption text-muted-foreground">{view.shifts.add.reason}</span>
          )}
        </div>
      </section>
    </SectionCard>
  );
}
