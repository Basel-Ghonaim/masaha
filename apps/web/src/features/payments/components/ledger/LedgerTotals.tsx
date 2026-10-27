import type { RefObject } from 'react';
import type { LedgerView } from '../../hooks/ledger/useLedger';

/**
 * The totals line: its period first, then what the server's totals say (DI-2, DI-11), and the voided
 * ones apart; said politely as it changes, and the focus's place once the last row's action leaves.
 */
export function LedgerTotals({
  totals,
  focusRef,
}: {
  totals: NonNullable<LedgerView['totals']>;
  focusRef: RefObject<HTMLElement | null>;
}) {
  return (
    <p
      ref={(element) => {
        focusRef.current = element;
      }}
      tabIndex={-1}
      aria-live="polite"
      className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm"
    >
      <span className="text-label">{totals.line}</span>
      {totals.voided !== null && <span className="text-muted-foreground">{totals.voided}</span>}
    </p>
  );
}
