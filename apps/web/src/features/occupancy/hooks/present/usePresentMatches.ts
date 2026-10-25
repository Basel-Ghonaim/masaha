import { useCopy } from '@shared/copy';
import { matchesPerson } from '../../services/matchesPerson';
import type { PresentRowView } from '../../types/PresentRowView';
import { usePresentList } from '../now/usePresentList';

/**
 * The desk's search's first group (K1): the people present whose name, or whose phone's last digits,
 * answer the term, in the server's order and worded as the present list words them — from the same
 * state now, so no request more. No one for an empty term.
 */
export function usePresentMatches(
  spaceId: number,
  term: string,
  phones: ReadonlyMap<number, string>,
): { heading: string; rows: PresentRowView[] } {
  const copy = useCopy();
  const list = usePresentList(spaceId, { now: new Date() });
  return {
    heading: copy.occupancy.present.matches,
    rows: list.rows.filter((row) => matchesPerson(row.person, term, phones)),
  };
}
