import type { PresentPerson } from '@masaha/shared/occupancy';
import { Button, LogInIcon, LogOutIcon } from '@shared/design-system';
import type { RefObject } from 'react';
import type { StateAction, StateActionsView } from '../../hooks/customer-actions/useStateActions';
import { useVisitTermsQuery } from '../../hooks/terms/useVisitTermsQuery';
import { CheckOutDialog } from '../check-out/CheckOutDialog';
import { PayDialog } from '../pay/PayDialog';
import { UsageOutDialog } from '../usage-out/UsageOutDialog';

/** No one is picked in a dialog opened on a named customer: the picker is not shown. */
const NO_ONE_PRESENT: ReadonlySet<number> = new Set();

const ICONS = { checkIn: LogInIcon, checkOut: LogOutIcon } as const;

/**
 * A customer's actions by their state as buttons, the file's header's (D8.1): the first `primary`,
 * the others `outline`, at the layer's default size, so 44 px on touch. `opened` hears which one ran.
 */
export function StateButtons({
  actions,
  opened,
}: {
  actions: StateAction[];
  opened: (from: HTMLElement) => void;
}) {
  return actions.map((action, index) => {
    const Icon = action.key === 'checkIn' || action.key === 'checkOut' ? ICONS[action.key] : null;
    return (
      <Button
        key={action.key}
        variant={index === 0 ? 'primary' : 'outline'}
        aria-label={action.name ?? undefined}
        aria-disabled={action.busy || undefined}
        aria-busy={action.busy || undefined}
        onClick={(event) => {
          opened(event.currentTarget);
          action.run(event.currentTarget);
        }}
      >
        {Icon !== null && <Icon aria-hidden />}
        {action.label}
      </Button>
    );
  });
}

/**
 * The dialogs a customer's state actions open: the payment on its item, a visit's check-out, and a
 * usage-based subscriber's due. Each closed gives the focus to `returnFocus`'s element.
 */
export function StateDialogs({
  spaceId,
  dialogs,
  returnFocus,
}: {
  spaceId: number;
  dialogs: StateActionsView['dialogs'];
  returnFocus: RefObject<HTMLElement | null>;
}) {
  return (
    <>
      {dialogs.pay !== null && (
        // Each opening is a new intent: a new dialog, a new key (S4).
        <PayDialog
          key={dialogs.payOpening}
          spaceId={spaceId}
          target={dialogs.pay}
          presentIds={NO_ONE_PRESENT}
          onClose={dialogs.closePay}
          returnFocus={() => returnFocus.current}
        />
      )}
      {dialogs.visitOut !== null && (
        <VisitCheckOut
          spaceId={spaceId}
          person={dialogs.visitOut}
          onClose={dialogs.closeVisitOut}
          returnFocus={returnFocus}
        />
      )}
      {dialogs.usageDue !== null && (
        <UsageOutDialog
          spaceId={spaceId}
          name={dialogs.usageDue.name}
          checkOut={dialogs.usageDue.checkOut}
          onClose={dialogs.closeUsageDue}
          returnFocus={() => {
            returnFocus.current?.focus();
          }}
        />
      )}
    </>
  );
}

/** A present visit's check-out, once the terms say whether a price may be typed. */
function VisitCheckOut({
  spaceId,
  person,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  person: Extract<PresentPerson, { kind: 'VISIT' }>;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const terms = useVisitTermsQuery(spaceId).data;
  return terms === undefined ? null : (
    <CheckOutDialog
      spaceId={spaceId}
      person={person}
      terms={terms}
      returnFocus={returnFocus}
      onClose={onClose}
    />
  );
}
