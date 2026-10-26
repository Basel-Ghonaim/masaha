import { SubscriptionSheet, type SheetEntry } from '@features/desk';
import { useOfferedPackages } from '@features/packages';
import { useSpacePrices, useSpaceShifts } from '@features/spaces';

/**
 * `desk`'s subscription sheet with what other capabilities hold for it (S1): the space's offered
 * packages, as `packages` reads them, and its published prices and shifts, as `spaces` reads them.
 * It is mounted only while the sheet is open; the prices are read again each time it opens (finding
 * 171), so the sheet never sells from an older read.
 */
export function SubscriptionSheetSlot({
  spaceId,
  entry,
  returnFocus,
  onClose,
}: {
  spaceId: number;
  entry: SheetEntry;
  returnFocus: () => HTMLElement | null;
  onClose: () => void;
}) {
  const offered = useOfferedPackages(spaceId);
  const shifts = useSpaceShifts('owner', spaceId);
  const prices = useSpacePrices('owner', spaceId);

  return (
    <SubscriptionSheet
      spaceId={spaceId}
      entry={entry}
      choices={{
        ...offered,
        prices: { state: prices.state, list: prices.prices, refresh: prices.refresh },
        shifts,
      }}
      returnFocus={returnFocus}
      onClose={onClose}
    />
  );
}
