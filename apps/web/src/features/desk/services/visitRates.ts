import type { Rates, VisitTerms } from '@masaha/shared/visits';

const NO_RATES: Rates = { hourAgorot: null, dayAgorot: null };

/** The terms' row a visit would copy: the shift's, else the one with no shift. */
function rowOf(terms: VisitTerms, shiftId: number | null) {
  return (
    terms.rates.find((row) => row.shiftId === shiftId) ??
    terms.rates.find((row) => row.shiftId === null)
  );
}

/**
 * The rates a visit checked in now would copy, as the server's terms say (DI-41's one rule): the
 * chosen shift's row, else the row with no shift; the student rates only where that row carries them.
 */
export function ratesFor(
  terms: VisitTerms,
  { shiftId, student }: { shiftId: number | null; student: boolean },
): Rates {
  const row = rowOf(terms, shiftId);
  if (row === undefined) return NO_RATES;
  return student && row.student !== null ? row.student : row.general;
}

/** Whether «طالب» is offered: only where the chosen row carries student rates. */
export function offersStudent(terms: VisitTerms, shiftId: number | null): boolean {
  return (rowOf(terms, shiftId)?.student ?? null) !== null;
}
