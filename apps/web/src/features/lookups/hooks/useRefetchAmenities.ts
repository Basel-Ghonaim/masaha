import { useQueryClient } from '@tanstack/react-query';
import { lookupsKeys } from './queryKeys';

/**
 * Fetches the amenities again after a write: the server stays the one source of truth. The promise
 * settles once the list has arrived, so a mutation that returns it stays pending until then.
 */
export function useRefetchAmenities() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: lookupsKeys.amenities });
}
