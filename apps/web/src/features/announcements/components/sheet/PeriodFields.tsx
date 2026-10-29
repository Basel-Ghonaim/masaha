import { gazaClockOf } from '@masaha/shared/core';
import { Field, Input, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import {
  Calendar,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
} from '@shared/design-system/calendar';
import { useLanguage } from '@shared/localisation';
import { useState } from 'react';
import type { AnnouncementSheetView } from '../../hooks/sheet/useAnnouncementSheet';

type End = AnnouncementSheetView['start'] | AnnouncementSheetView['end'];
type DateView = End['date'];

/** A Gaza date (`YYYY-MM-DD`) as the calendar's day: that date at the browser's midnight. */
const dayOf = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};
/** The calendar's day as its date (`YYYY-MM-DD`), read on the browser's calendar it was drawn on. */
const dateOf = (day: Date) =>
  `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

/** A date on a calendar: the trigger says it («29 سبتمبر 2026», DI-22); a day chosen closes it. */
function DateField({ date, disabled }: { date: DateView; disabled: boolean }) {
  const lang = useLanguage() === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  const chosen = dayOf(date.value);

  return (
    <Field label={date.label}>
      <DatePicker open={open} onOpenChange={setOpen}>
        <DatePickerTrigger disabled={disabled}>{date.text}</DatePickerTrigger>
        <DatePickerContent label={date.panel}>
          <Calendar
            lang={lang}
            mode="single"
            required
            defaultMonth={chosen}
            selected={chosen}
            // Gaza's today, as every other date of the sheet (S9), not the browser's.
            today={dayOf(gazaClockOf(new Date()).date)}
            onSelect={(day) => {
              date.choose(dateOf(day));
              setOpen(false);
            }}
            previousMonthLabel={date.previous}
            nextMonthLabel={date.next}
          />
        </DatePickerContent>
      </DatePicker>
    </Field>
  );
}

/**
 * One end of the period: its mode as chips («الآن · في موعد», «في موعد · بلا موعد») and, «في موعد»,
 * the date and the time on Gaza's clock, the date over the time below 640 px (DI-22).
 */
function PeriodEnd({ end, disabled }: { end: End; disabled: boolean }) {
  const help = 'help' in end ? end.help : null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {end.modes === null ? (
        <p className="text-label">{end.label}</p>
      ) : (
        <Field label={end.label} helper={help ?? undefined}>
          <ToggleGroup
            type="single"
            value={end.mode}
            onValueChange={end.choose}
            disabled={disabled}
            className="flex flex-wrap gap-2"
          >
            {end.modes.map((mode) => (
              <ToggleGroupItem key={mode.value} value={mode.value}>
                {mode.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      )}
      {end.at && (
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField date={end.date} disabled={disabled} />
          <Field label={end.time.label} error={end.time.error}>
            <Input type="time" dir="ltr" {...end.time.field} />
          </Field>
        </div>
      )}
    </div>
  );
}

/** The period: when it starts and when it ends, each on Gaza's clock (S9). */
export function PeriodFields({
  start,
  end,
  disabled,
}: {
  start: AnnouncementSheetView['start'];
  end: AnnouncementSheetView['end'];
  disabled: boolean;
}) {
  return (
    <>
      <PeriodEnd end={start} disabled={disabled} />
      <PeriodEnd end={end} disabled={disabled} />
    </>
  );
}
