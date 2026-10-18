import { useQueryClient } from '@tanstack/react-query';

/** Fetches the admin's views again after a write on a space's owners. */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin'] }, { cancelRefetch: false });
}
