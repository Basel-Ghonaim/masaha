import type { Page } from '@shared/api';
import { useEffect } from 'react';

/**
 * Shows the last page in place of one past it, as after deleting the last row there: `pastLast`
 * while the answer for the page asked is empty and the list has pages before it.
 */
export function usePageInRange({
  answer,
  placeholder,
  page,
  replacePage,
}: {
  answer: Page<unknown[]> | undefined;
  /** Whether the answer is the one before, shown while the page asked loads. */
  placeholder: boolean;
  page: number;
  replacePage: (page: number) => void;
}): boolean {
  const lastPage = answer?.meta.totalPages ?? 0;
  const pastLast =
    answer !== undefined &&
    !placeholder &&
    answer.data.length === 0 &&
    lastPage > 0 &&
    page > lastPage;
  useEffect(() => {
    if (pastLast) replacePage(lastPage);
  }, [pastLast, lastPage, replacePage]);
  return pastLast;
}
