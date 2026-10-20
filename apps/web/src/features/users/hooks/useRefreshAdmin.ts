import { useQueryClient } from '@tanstack/react-query';

/** Fetches the admin's views again after the admin acts on an account (architecture §7). */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin'] }, { cancelRefetch: false });
}
