import type { Shift } from '@masaha/shared/spaces';
import type { EditorPlace } from '../../types/EditorPlace';
import { useSpaceQuery } from './useSpaceQuery';

/**
 * The space's saved shifts, as the editor at `place` reads the space, for another capability's page
 * to offer (a package's shift): none when it has no hours, `null` while the space loads or once it
 * has failed.
 */
export function useSpaceShifts(place: EditorPlace, spaceId: number): Shift[] | null {
  const space = useSpaceQuery(place, spaceId).data;
  return space === undefined ? null : (space.hours?.shifts ?? []);
}
