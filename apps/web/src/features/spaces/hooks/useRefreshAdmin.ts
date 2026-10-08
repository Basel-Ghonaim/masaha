import { useQueryClient } from '@tanstack/react-query';

/**
 * Fetches the admin's views again after a write on a space. A space's life shows in another
 * capability's list (`space-links`), whose keys this capability does not know, so the whole admin
 * scope is fetched again, as the front desk refreshes a space's (docs/frontend/architecture.md §7).
 * The promise settles once the lists have arrived, so a mutation that returns it stays pending until
 * then. A fetch already under way is left to finish, so another row's write never cancels the one
 * its own action waits on.
 */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin'] }, { cancelRefetch: false });
}
