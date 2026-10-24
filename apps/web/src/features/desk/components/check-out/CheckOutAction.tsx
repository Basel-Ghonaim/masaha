import type { PresentPerson } from '@masaha/shared/occupancy';
import type { VisitTerms } from '@masaha/shared/visits';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useRef, useState } from 'react';
import { CheckOutDialog } from './CheckOutDialog';

/**
 * A present person's «خروج», named by them, at the layer's default size, so it is 44 px on touch
 * (DI-16): a visit's opens its check-out. It waits for the terms, which say whether a price may be
 * typed. A subscriber's check-out is not built yet.
 */
export function CheckOutAction({
  spaceId,
  person,
  terms,
}: {
  spaceId: number;
  person: PresentPerson;
  terms: VisitTerms | undefined;
}) {
  const words = useCopy().desk.checkOut;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);

  if (person.kind !== 'VISIT') return null;

  return (
    <>
      <Button
        ref={trigger}
        variant="outline"
        aria-label={words.openName({ name: isolate(person.name) })}
        disabled={terms === undefined}
        onClick={() => {
          setOpen(true);
        }}
      >
        {words.open}
      </Button>
      {open && terms !== undefined && (
        <CheckOutDialog
          spaceId={spaceId}
          person={person}
          terms={terms}
          returnFocus={trigger}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
