import { wholeNumberOf } from '@shared/lib';

type EndWords = {
  noEnd: string;
  noEndLimit: (values: { limit: string }) => string;
  endOrLimit: (values: { date: string; limit: string }) => string;
  days: (values: { count: number }) => string;
  hours: (values: { count: number }) => string;
};

/**
 * A custom subscription's end, said by the limits set (DK-008, G16.2): no end and no total — it stays
 * active until ended; a total and no end — it ends once the total is used; an end and a total —
 * whichever comes first. The total is the days', else the hours'; an end with no total needs no
 * note (`null`). `day` says the end's date.
 */
export function endNote(
  values: { endsOn: string; totalDays: string; totalHours: string },
  words: EndWords,
  day: (date: string) => string,
): string | null {
  const days = wholeNumberOf(values.totalDays);
  const hours = wholeNumberOf(values.totalHours);
  const limit =
    typeof days === 'number' && days > 0
      ? words.days({ count: days })
      : typeof hours === 'number' && hours > 0
        ? words.hours({ count: hours })
        : null;
  const ends = values.endsOn.trim();
  if (ends === '') return limit === null ? words.noEnd : words.noEndLimit({ limit });
  return limit === null ? null : words.endOrLimit({ date: day(ends), limit });
}
