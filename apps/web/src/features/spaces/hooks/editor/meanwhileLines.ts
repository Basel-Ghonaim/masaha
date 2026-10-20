import type { useCopy } from '@shared/copy';
import type { EditorPlace } from '../../types/EditorPlace';

type Copy = ReturnType<typeof useCopy>;

/**
 * What a write's refusal says when the space changed meanwhile, by place and by what was written:
 * a section's facts or the gallery. For the admin, a 403 is a space verified meanwhile (its owner
 * edits it now) and a 404 one deleted meanwhile.
 */
export function meanwhileLines(
  place: EditorPlace,
  copy: Copy,
  of: 'section' | 'photos' = 'section',
): { forbidden: string; not_found: string } {
  const words = of === 'photos' ? copy.spaces.editor.photos : copy.spaces.editor.section;
  return { forbidden: words.verifiedMeanwhile, not_found: words.deletedMeanwhile };
}
