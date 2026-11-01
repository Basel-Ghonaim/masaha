import { phoneSchema } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { useEffect, useState } from 'react';
import { useCustomersSearchQuery } from '../search/useCustomersSearchQuery';

/** How long a typed phone waits after the last key before it is looked up. */
const PAUSE_MS = 400;

/**
 * Whose file a typed phone adds to (G13.12): once the phone is valid and typing pauses, the
 * customers it finds (two at most, `GET …/customers?q`): one — «يُضاف إلى ملف {name}»; none — «زبون
 * جديد بهذا الرقم»; while reading, or two, or no valid phone, nothing. The server decides at the
 * write; the line only says what it will find.
 */
export function usePhoneOwner(spaceId: number, phone: string): string | null {
  const words = useCopy().desk.debt;
  const parsed = phoneSchema.safeParse(phone);
  const valid = parsed.success ? parsed.data : null;
  const [paused, setPaused] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaused(valid);
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [valid]);
  const asked = paused !== null && paused === valid ? paused : null;
  const query = useCustomersSearchQuery(spaceId, asked === null ? null : { q: asked, limit: 2 });

  if (asked === null || query.isPlaceholderData || query.data === undefined) return null;
  const [only, second] = query.data.data;
  if (only === undefined) return words.newCustomer;
  return second === undefined ? words.adds({ name: isolate(only.name) }) : null;
}
