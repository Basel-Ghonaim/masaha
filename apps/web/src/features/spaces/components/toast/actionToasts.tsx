import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { lineParts } from '../../services/lineParts';
import type { SpaceNameView } from '../../types/SpaceNameView';
import { ActionRefusal } from './ActionRefusal';
import { NamedLine } from './NamedLine';

type Line = (values: { name: string }) => string;

/** A line that names a space, ready to render. */
const namedLine = (line: Line, name: SpaceNameView) => ({ ...lineParts(line), name });

/** Says what an action did to a space, by its name; an `action` offers a step back. */
export function toastDone(
  line: Line,
  name: SpaceNameView,
  options?: { duration: number; action: { label: string; onClick: () => void } },
) {
  toast(<NamedLine line={namedLine(line, name)} />, options);
}

/**
 * Says that an action on a space failed, by its name, with the refusal under it. It stays until it is
 * closed, so its reference can be read and reported.
 */
export function toastFailed(line: Line, name: SpaceNameView, refusal: AppError) {
  toast.error(<NamedLine line={namedLine(line, name)} />, {
    description: <ActionRefusal refusal={refusal} title={line({ name: isolate(name.text) })} />,
    duration: Infinity,
  });
}
