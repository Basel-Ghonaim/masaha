import { useAmenityNames } from '../../hooks/amenities/useAmenityNames';

/** A space's amenities, by their names, as one line of text: what a read-only page shows. */
export function AmenityNames({ ids }: { ids: number[] }) {
  return useAmenityNames(ids);
}
