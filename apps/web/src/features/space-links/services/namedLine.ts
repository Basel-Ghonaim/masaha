import { lineParts } from '@shared/localisation';
import type { NamedLineView } from '../types/NamedLineView';
import type { SpaceNameView } from '../types/AdminSpaceRowView';

/** Cuts a line around a space's name, so the name keeps its own language. */
export function namedLine(
  line: (values: { name: string }) => string,
  name: SpaceNameView,
): NamedLineView {
  const parts = lineParts(line);
  return { ...parts, name };
}
