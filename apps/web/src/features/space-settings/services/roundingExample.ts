import type { Catalogue } from '@shared/copy';

/**
 * The example of "round up after N minutes": the stay a minute under N past two hours is charged
 * two, the one a minute over three — «ساعتان و9 دقائق = ساعتان · ساعتان و11 دقيقة = 3 ساعات». At
 * N = 1 the stay under it is two hours sharp. Each count through the catalogue's plural forms.
 */
export function roundingExample(minutes: number, words: Catalogue['spaceSettings']['pricing']) {
  const under = minutes === 1 ? words.twoHours : words.twoHoursAnd({ count: minutes - 1 });
  return words.example({ under, over: words.twoHoursAnd({ count: minutes + 1 }) });
}
