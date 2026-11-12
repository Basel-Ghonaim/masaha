import type { Catalogue } from '@shared/copy';
import type { SectionId } from '../../types/SectionId';

/** A section's name, as its card titles it, the index lists it and its toasts and failures say it. */
export function sectionName(section: SectionId, copy: Catalogue): string {
  return copy.spaces.editor.sectionNames[section];
}
