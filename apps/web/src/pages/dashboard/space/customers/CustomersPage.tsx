import { CustomersList } from '@features/desk';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { spaceCustomerPath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';
import { SubscriptionSheetSlot } from '../SubscriptionSheetSlot';
import { useSheetOpener } from '../useSheetOpener';

/**
 * «الزبائن», the owner's and reception's: `desk`'s customers list, each name a link to the
 * customer's file below this page; «زبون جديد» in the top bar and a row's «اشتراك جديد» open `desk`'s
 * subscription sheet. Whether the list offers «مؤرشف» is read from the session's link
 * at the space in the address (S5); the server decides. The guard has checked the space's id and
 * the role.
 */
export function CustomersPage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  const owner = useSession(
    (session) => session.user?.spaces.find((link) => link.spaceId === spaceId)?.role === 'OWNER',
  );
  // Made once per space: a new one would draw every row of the table anew.
  const fileLink = useCallback(
    (customerId: number) => spaceCustomerPath(spaceId ?? 0, customerId),
    [spaceId],
  );

  const words = useCopy().desk.sheet;
  const sheet = useSheetOpener();

  return (
    <>
      <PageHeader>
        {spaceId !== undefined && (
          <Button
            size="sm"
            className="ms-auto"
            onClick={() => {
              sheet.open({ mode: 'new' });
            }}
          >
            {words.entry.new}
          </Button>
        )}
      </PageHeader>
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        <>
          {/* Another space is another list: nothing typed for one carries over to the next. */}
          <CustomersList
            key={spaceId}
            spaceId={spaceId}
            owner={owner}
            fileLink={fileLink}
            subscribe={sheet.open}
          />
          {sheet.entry !== null && (
            <SubscriptionSheetSlot
              key={`sheet-${String(sheet.opening)}`}
              spaceId={spaceId}
              entry={sheet.entry}
              onClose={sheet.close}
            />
          )}
        </>
      )}
    </>
  );
}
