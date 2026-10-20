import type { EditorPlace } from '../types/EditorPlace';

/**
 * Whether the editor offers a space's fields to edit, as the server decides who may write them: the
 * admin while the space is unverified, an owner once it is, an owner's link being what verifies it.
 * The page only mirrors the rule; a write it lets through is still the server's to refuse.
 */
export function mayEdit(place: EditorPlace, isVerified: boolean): boolean {
  return place === 'admin' ? !isVerified : isVerified;
}
