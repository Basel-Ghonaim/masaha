import { useRefusalView, type FormFailureView, type Refusal } from '@shared/forms';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { spacesKeys } from '../queryKeys';

/** The wait left until `until`, as a refusal for too many requests; none once it has passed. */
function refusalUntil(until: number | null): Refusal | null {
  if (until === null) return null;
  const seconds = Math.ceil((until - Date.now()) / 1000);
  return seconds > 0
    ? { type: 'rate_limit', code: undefined, requestId: undefined, retryAfterSeconds: seconds }
    : null;
}

/**
 * Whether every row's actions wait out a 429 (`blocked`), and the wait, counting down, to show beside
 * them. The wait is the one time any action's 429 recorded (`useRecordHold`), the latest of them, so
 * it holds whatever rows a change of filter or page brings, and a page opened during it counts the
 * time left. Once it has passed, it is cleared. Each failure's own toast names its space.
 */
export function useSpaceActionsHold(): { view: FormFailureView | null; blocked: boolean } {
  const queryClient = useQueryClient();
  const { data: until = null } = useQuery<number | null>({
    queryKey: spacesKeys.hold,
    queryFn: skipToken,
    gcTime: Infinity,
    staleTime: Infinity,
  });

  // The time left, read once for each recorded time, so the count is the same object from one render
  // to the next.
  const [counted, setCounted] = useState(until);
  const [refusal, setRefusal] = useState(() => refusalUntil(until));
  if (counted !== until) {
    setCounted(until);
    setRefusal(refusalUntil(until));
  }

  // Only a 429 reaches it, whose view carries the wait and no title.
  const hold = useRefusalView(refusal, '');

  useEffect(() => {
    if (until !== null && !hold.blocked && until <= Date.now()) {
      queryClient.setQueryData(spacesKeys.hold, null);
    }
  }, [until, hold.blocked, queryClient]);

  return hold;
}
