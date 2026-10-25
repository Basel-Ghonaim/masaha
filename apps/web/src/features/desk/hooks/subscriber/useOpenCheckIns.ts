import type { PresentPerson } from '@masaha/shared/occupancy';
import { useCopy } from '@shared/copy';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useMemo } from 'react';
import { dayText } from '../../services/dayText';
import { progressLines } from '../../services/progressLines';
import { useOpenCheckInsQuery } from './useOpenCheckInsQuery';

/**
 * What the open check-ins add to the people present, for the page to hand `occupancy`: each
 * subscriber's phone, by customer id, which the search's first group matches by its last digits; and
 * a subscriber's usage line — their subscription's first progress line, as the file says it — for
 * the present list's usage cell. `ids` are the state now's check-ins.
 */
export function useOpenCheckIns(spaceId: number, ids: readonly number[]) {
  const words = useCopy().desk.subscriber.progress;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const checkIns = useOpenCheckInsQuery(spaceId, ids).data;

  return useMemo(() => {
    const phones = new Map<number, string>();
    const lines = new Map<number, string>();
    for (const checkIn of checkIns ?? []) {
      if (checkIn.customer.phone !== null) phones.set(checkIn.customer.id, checkIn.customer.phone);
      const [first] = progressLines(checkIn.subscription, words, {
        price: (agorot) => isolate(priceText(agorot, language)),
        day: (date) => isolate(dayText(date, language)),
      });
      if (first !== undefined) lines.set(checkIn.id, first);
    }
    return {
      phones,
      usage: (person: PresentPerson) =>
        person.kind === 'CHECK_IN' ? (lines.get(person.id) ?? null) : null,
    };
  }, [checkIns, words, language]);
}
