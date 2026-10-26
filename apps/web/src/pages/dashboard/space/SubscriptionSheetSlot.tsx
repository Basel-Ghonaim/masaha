import { SubscriptionSheet, type SheetEntry } from '@features/desk';
import { useOfferedPackages } from '@features/packages';
import { useSpaceShifts } from '@features/spaces';

/**
 * `desk`'s subscription sheet with what other capabilities hold for it (S1): the space's offered
 * packages, as `packages` reads them, and its shifts, as `spaces` reads them. It is mounted only
 * while the sheet is open, so those are read when it opens.
 */
export function SubscriptionSheetSlot({
  spaceId,
  entry,
  onClose,
}: {
  spaceId: number;
  entry: SheetEntry;
  onClose: () => void;
}) {
  const offered = useOfferedPackages(spaceId);
  const shifts = useSpaceShifts('owner', spaceId);

  return (
    <SubscriptionSheet
      spaceId={spaceId}
      entry={entry}
      choices={{ ...offered, shifts }}
      onClose={onClose}
    />
  );
}
