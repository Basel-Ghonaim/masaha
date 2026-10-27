import { VoidPaymentAction } from '@features/desk';
import { PaymentsLedger, type LedgerPerson, type LedgerRowAction } from '@features/payments';
import { useStaffPeople } from '@features/staff';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { spaceCustomerPath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «الدفعات», the owner's: `payments`' ledger, its staff filter naming the owner signed in and
 * `staff`'s reception accounts, each customer a link to their file, and `desk`'s void in each row of
 * a payment not voided (S1). No action in the top bar: the CSV export is Finance's (DI-1). The guard
 * has checked the space's id and the owner's role.
 */
export function PaymentsPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another ledger: nothing chosen for one carries over to the next.
        <Ledger key={spaceId} spaceId={spaceId} />
      )}
    </>
  );
}

function Ledger({ spaceId }: { spaceId: number }) {
  const user = useSession((session) => session.user);
  const staff = useStaffPeople(spaceId);
  // The owner signed in, then the space's reception accounts; a space's other owners cannot be
  // named (finding 166), and a failed read leaves the owner alone.
  const people: LedgerPerson[] = [
    ...(user === null ? [] : [{ id: user.id, name: user.name, self: true, active: true }]),
    ...staff.people.map((person) => ({ ...person, self: false })),
  ];
  // Made once per space: a new one would draw every row of the table anew.
  const customerLink = useCallback(
    (customerId: number) => spaceCustomerPath(spaceId, customerId),
    [spaceId],
  );
  const rowAction = useCallback<LedgerRowAction>(
    (payment, gone) =>
      payment.voided ? null : (
        <VoidPaymentAction spaceId={spaceId} payment={payment} onGone={gone} />
      ),
    [spaceId],
  );

  return (
    <PaymentsLedger
      spaceId={spaceId}
      people={people}
      customerLink={customerLink}
      rowAction={rowAction}
    />
  );
}
