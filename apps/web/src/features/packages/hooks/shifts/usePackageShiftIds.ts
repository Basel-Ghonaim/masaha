import { usePackagesQuery } from '../list/usePackagesQuery';

/**
 * The shifts the space's packages use, retired packages included: a shift one of them names cannot be
 * removed (the database's key refuses it), so the space profile's shifts say so on their rows (SD5).
 * Empty while the packages load or once they have failed; the server's refusal still guards it.
 */
export function usePackageShiftIds(spaceId: number): number[] {
  const query = usePackagesQuery(spaceId);
  return [
    ...new Set((query.data ?? []).flatMap(({ shiftId }) => (shiftId === null ? [] : [shiftId]))),
  ];
}
