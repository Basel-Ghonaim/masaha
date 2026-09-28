import {
  Calendar,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
  Field,
  type DateRange,
} from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type DatePickerSamples = {
  title: string;
  caption: string;
  previous: string;
  next: string;
  start: { label: string; helper: string; placeholder: string; panel: string };
  period: { preset: string; panel: string };
  invalid: { label: string; placeholder: string; error: string; panel: string };
};

const MONTH = new Date(2026, 8, 1);
const FIELD_WIDTH = 'w-full max-w-80';

// The app's formatting will live in its localisation layer; the showcase formats as the stress
// tests show dates: 28/09/2026, with Western digits in either language.
function formatDate(date: Date, lang: 'ar' | 'en') {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function DatePickerSection({
  samples,
  lang,
}: {
  samples: DatePickerSamples;
  lang: 'ar' | 'en';
}) {
  const { start, period, invalid } = samples;
  const labels = { previousMonthLabel: samples.previous, nextMonthLabel: samples.next };
  const [startOpen, setStartOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [range, setRange] = useState<DateRange>();

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={start.label} helper={start.helper} className={FIELD_WIDTH}>
          <DatePicker open={startOpen} onOpenChange={setStartOpen}>
            <DatePickerTrigger empty={startDate === undefined}>
              {startDate === undefined ? start.placeholder : formatDate(startDate, lang)}
            </DatePickerTrigger>
            <DatePickerContent label={start.panel}>
              <Calendar
                lang={lang}
                mode="single"
                defaultMonth={MONTH}
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setStartOpen(false);
                }}
                {...labels}
              />
            </DatePickerContent>
          </DatePicker>
        </Field>
        <DatePicker>
          <DatePickerTrigger className="w-auto">
            {range?.from === undefined
              ? period.preset
              : `${formatDate(range.from, lang)} – ${range.to === undefined ? '' : formatDate(range.to, lang)}`}
          </DatePickerTrigger>
          <DatePickerContent label={period.panel}>
            <Calendar
              lang={lang}
              mode="range"
              defaultMonth={MONTH}
              selected={range}
              onSelect={setRange}
              {...labels}
            />
          </DatePickerContent>
        </DatePicker>
        <Field label={invalid.label} error={invalid.error} className={FIELD_WIDTH}>
          <DatePicker>
            <DatePickerTrigger empty>{invalid.placeholder}</DatePickerTrigger>
            <DatePickerContent label={invalid.panel}>
              <Calendar lang={lang} mode="single" defaultMonth={MONTH} {...labels} />
            </DatePickerContent>
          </DatePicker>
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
