import { StaffList, type ShownPassword } from '@features/staff';
import { TemporaryPasswordDialog } from '@features/users';
import { useCopy } from '@shared/copy';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { PageHeader } from '../shell/PageHeader';

/** The one-time password dialog of `users`, for a password the staff page shows once. */
const temporaryPassword = (shown: ShownPassword) => <TemporaryPasswordDialog {...shown} />;

/**
 * The owner's «الموظفون»: what a receptionist reaches, then the space's reception accounts, the
 * list of `staff`, whose temporary passwords show in `users`' one-time dialog, their handover
 * recorded on the space's staff route. The guard has checked the space's id and the owner's role.
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
          <StaffList key={spaceId} spaceId={spaceId} temporaryPassword={temporaryPassword} />
        </div>
      )}
    </>
  );
}
