import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import {
  Calendar,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
} from '@shared/design-system/calendar';
import { useLanguage } from '@shared/localisation';
import { useState } from 'react';

/** A Gaza date (`YYYY-MM-DD`) as the calendar's day: that date at the browser's midnight. */
const dayOf = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};
/** The calendar's day as its date (`YYYY-MM-DD`), read on the browser's calendar it was drawn on. */
const dateOf = (day: Date) =>
  `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

/**
 * One of the sheet's dates as the layer's date picker (G16.1), inside its `Field`: the chosen day
 * said on the trigger, a day chosen closing it; with `clear`, the picker offers the way back to no
 * date («بلا تاريخ نهاية»).
 */
export function DateField({
  date,
  disabled,
}: {
  date: {
    label: string;
    value: string;
    text: string;
    choose: (date: string) => void;
    clear?: { label: string; run: () => void };
  };
  disabled: boolean;
}) {
  const words = useCopy().desk.sheet.calendar;
  const lang = useLanguage() === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  const chosen = date.value === '' ? undefined : dayOf(date.value);

  return (
    <DatePicker open={open} onOpenChange={setOpen}>
      <DatePickerTrigger disabled={disabled} empty={date.value === ''}>
        {date.text}
      </DatePickerTrigger>
      <DatePickerContent label={date.label}>
        <Calendar
          lang={lang}
          mode="single"
          defaultMonth={chosen}
          selected={chosen}
          onSelect={(next: Date | undefined) => {
            if (next === undefined) return;
            date.choose(dateOf(next));
            setOpen(false);
          }}
          previousMonthLabel={words.previous}
          nextMonthLabel={words.next}
        />
        {date.clear !== undefined && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                date.clear?.run();
                setOpen(false);
              }}
            >
              {date.clear.label}
            </Button>
          </div>
        )}
      </DatePickerContent>
    </DatePicker>
  );
}
