import type { PresentPerson } from '@masaha/shared/occupancy';
import type { VisitTerms } from '@masaha/shared/visits';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useRef, useState, type RefObject } from 'react';
import type { PayTarget } from '../../hooks/pay/usePayDialog';
import { useCheckOutSubscriber } from '../../hooks/subscriber/useCheckOutSubscriber';
import { CheckOutDialog } from './CheckOutDialog';

/** What follows a check-out started from the desk's search: it is cleared and focused. */
type After = { done: () => void; focus: RefObject<HTMLElement | null> };

/**
 * A present person's «خروج», named by them, at the layer's default size, so it is 44 px on touch
 * (DI-16): a visit's opens its check-out, once the terms say whether a price may be typed; a
 * subscriber's checks them out in one tap. From the search (`after`), the search is cleared and
 * takes the focus once it is done (S10).
 */
export function CheckOutAction({
  spaceId,
  person,
  terms,
  after,
  receive,
}: {
  spaceId: number;
  person: PresentPerson;
  terms: VisitTerms | undefined;
  after?: After;
  /** Opens the payment on what a subscriber's check-out leaves owed. */
  receive?: (target: PayTarget) => void;
}) {
  return person.kind === 'VISIT' ? (
    <VisitCheckOutAction spaceId={spaceId} person={person} terms={terms} after={after} />
  ) : (
    <SubscriberCheckOutAction spaceId={spaceId} person={person} after={after} receive={receive} />
  );
}

function VisitCheckOutAction({
  spaceId,
  person,
  terms,
  after,
}: {
  spaceId: number;
  person: Extract<PresentPerson, { kind: 'VISIT' }>;
  terms: VisitTerms | undefined;
  after?: After;
}) {
  const words = useCopy().desk.checkOut;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);

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
          returnFocus={after?.focus ?? trigger}
          onClose={() => {
            setOpen(false);
          }}
          onCheckedOut={after?.done}
        />
      )}
    </>
  );
}

/**
 * A subscriber's «خروج»: one tap. While it is sent the button keeps the focus, marked busy, so the
 * list can hand the focus on once the row leaves (S10, DI-31).
 */
function SubscriberCheckOutAction({
  spaceId,
  person,
  after,
  receive,
}: {
  spaceId: number;
  person: Extract<PresentPerson, { kind: 'CHECK_IN' }>;
  after?: After;
  receive?: (target: PayTarget) => void;
}) {
  const checkOut = useCheckOutSubscriber(spaceId, person, { done: after?.done, receive });

  return (
    <Button
      variant="outline"
      aria-label={checkOut.name}
      aria-disabled={checkOut.busy || undefined}
      aria-busy={checkOut.busy || undefined}
      onClick={checkOut.run}
    >
      {checkOut.label}
    </Button>
  );
}
