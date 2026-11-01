import { useMonthCollections } from '@features/finance';
import { StaffList, type ShownPassword } from '@features/staff';
import { gazaClockOf } from '@masaha/shared/core';
import { TemporaryPasswordDialog } from '@features/users';
import { useCopy } from '@shared/copy';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The one-time password dialog of `users`, for a password the staff page shows once. */
const temporaryPassword = (shown: ShownPassword) => <TemporaryPasswordDialog {...shown} />;

/**
 * The owner's «الموظفون»: what a receptionist reaches, then the space's reception accounts, the
 * list of `staff`, whose temporary passwords show in `users`' one-time dialog, their handover
 * recorded on the space's staff route; each with what they collected this month, `finance`'s, a
 * link to the ledger of it (D5.6). The guard has checked the space's id and the owner's role.
 */
export function StaffPage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  const intro = useCopy().staff.intro;

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-muted-foreground">{intro}</p>
          {/* Another space is another list: nothing typed for one carries over to the next. */}
          <SpaceStaff key={spaceId} spaceId={spaceId} />
        </div>
      )}
    </>
  );
}

/** One space's staff, each with this month's collections and the ledger of them. */
function SpaceStaff({ spaceId }: { spaceId: number }) {
  const { collectedOf } = useMonthCollections(spaceId);
  const today = gazaClockOf(new Date()).date;
  // The ledger's own address names (EC16, `ledgerQueryOf`): the person, the month's days to today.
  const link = (userId: number) =>
    `${spacePagePath(spaceId, 'payments')}?staff=${String(userId)}&from=${today.slice(0, 8)}01&to=${today}`;

  return (
    <StaffList
      spaceId={spaceId}
      temporaryPassword={temporaryPassword}
      collections={{ of: collectedOf, link }}
    />
  );
}
