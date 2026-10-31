import { VoidPaymentAction } from '@features/desk';
import { ledgerPeople, PaymentsLedger, type LedgerRowAction } from '@features/payments';
import { useSpaceOwners } from '@features/spaces';
import { useStaffPeople } from '@features/staff';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { spaceCustomerPath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «الدفعات», the owner's: `payments`' ledger, its staff filter naming the owner signed in, the
 * space's other owners (`spaces`' managed read, finding 166) and `staff`'s reception accounts, each customer a link to their file, and `desk`'s void in each row of
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
  const owners = useSpaceOwners(spaceId);
  // The owner signed in, then the space's other owners, then its reception accounts; a failed read
  // leaves out those it would have named.
  const people = ledgerPeople({
    self: user === null ? null : { id: user.id, name: user.name },
    owners,
    reception: staff.people,
  });
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
