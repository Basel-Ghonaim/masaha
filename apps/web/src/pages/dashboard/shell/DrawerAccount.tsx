import { DrawerAccountMenu } from '@features/users';
import { useSession } from '@shared/session';

/**
 * The account at the head of the phone's drawer (DI-10): shown below 768 px only, where the top bar
 * leaves it out. `role` is the shell's word for the user's role.
 */
export function DrawerAccount({ role }: { role: string | undefined }) {
  const user = useSession((session) => session.user);
  if (!user) return null;

  return (
    <div className="shrink-0 p-2 md:hidden">
      <DrawerAccountMenu user={user} role={role} />
    </div>
  );
}
