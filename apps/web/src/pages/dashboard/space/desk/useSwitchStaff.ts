import { currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { SIGN_IN_PATH, spaceDeskPath } from '@shared/routing';
import { getSession, useSignOut } from '@shared/session';
import { useNavigate } from 'react-router';

/**
 * «تبديل الموظف» on the desk's shared device: signs out on the server, which owns the session, then
 * opens sign-in with the desk as the page to return to, so the next person lands back on it. A failed
 * sign-out keeps the session, as the server does, and says so.
 */
export function useSwitchStaff(spaceId: number) {
  const words = useCopy().desk;
  const navigate = useNavigate();
  const { signOut, isPending, error } = useSignOut();

  return {
    label: words.actions.switchStaff,
    busy: isPending,
    failure: error === null ? null : words.switchStaff.failed,
    run,
  };

  async function run(): Promise<void> {
    await signOut();
    // The sign-out keeps its failure for the screen; the session says whether it ended.
    if (getSession().status !== 'anonymous') {
      const copy = currentCopy();
      toast.error(copy.desk.switchStaff.failed, {
        action: { label: copy.status.retry, onClick: () => void run() },
      });
      return;
    }
    const next = new URLSearchParams({ next: spaceDeskPath(spaceId) });
    await navigate(`${SIGN_IN_PATH}?${next.toString()}`, { replace: true });
  }
}
