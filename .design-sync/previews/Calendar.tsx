import './_document';
import { Calendar, type DateRange } from '@masaha/design-system';
import { useState } from 'react';

// Ported from the showcase's CalendarSection
// (apps/web/src/pages/showcase/sections/CalendarSection.tsx). Fixed dates in September 2026, the
// month the stress tests are set in, so the capture does not depend on today.

const MONTH = new Date(2026, 8, 1);
const TODAY = new Date(2026, 8, 28);
const LABELS = { previousMonthLabel: 'عرض الشهر السابق', nextMonthLabel: 'عرض الشهر التالي' };

/** One chosen date. */
export function SingleDate() {
  const [day, setDay] = useState<Date | undefined>(new Date(2026, 8, 28));
  return (
    <Calendar
      lang="ar"
      mode="single"
      defaultMonth={MONTH}
      today={TODAY}
      selected={day}
      onSelect={setDay}
      className="rounded-lg border border-border bg-card"
      {...LABELS}
    />
  );
}

/** A chosen range of dates. */
export function RangeOfDates() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 8, 7),
    to: new Date(2026, 8, 16),
  });
  return (
    <Calendar
      lang="ar"
      mode="range"
      defaultMonth={MONTH}
      today={TODAY}
      selected={range}
      onSelect={setRange}
      className="rounded-lg border border-border bg-card"
      {...LABELS}
    />
  );
}
