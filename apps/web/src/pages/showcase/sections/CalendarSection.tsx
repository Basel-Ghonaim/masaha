import { Calendar, type DateRange } from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type CalendarSamples = {
  title: string;
  singleCaption: string;
  rangeCaption: string;
  previous: string;
  next: string;
};

// The month the stress tests are set in.
const MONTH = new Date(2026, 8, 1);

export function CalendarSection({
  samples,
  lang,
}: {
  samples: CalendarSamples;
  lang: 'ar' | 'en';
}) {
  const [day, setDay] = useState<Date | undefined>(new Date(2026, 8, 28));
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 8, 7),
    to: new Date(2026, 8, 16),
  });
  const labels = { previousMonthLabel: samples.previous, nextMonthLabel: samples.next };

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.singleCaption}>
        <Calendar
          lang={lang}
          mode="single"
          defaultMonth={MONTH}
          selected={day}
          onSelect={setDay}
          className="rounded-lg border border-border bg-card"
          {...labels}
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.rangeCaption}>
        <Calendar
          lang={lang}
          mode="range"
          defaultMonth={MONTH}
          selected={range}
          onSelect={setRange}
          className="rounded-lg border border-border bg-card"
          {...labels}
        />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
