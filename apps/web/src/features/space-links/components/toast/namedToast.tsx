import { toast } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { NamedLineView } from '../../types/NamedLineView';
import { NamedLine } from '../NamedLine';

/** Says what an action did to a space, by its name. */
export function toastNamed(line: NamedLineView, description?: ReactNode) {
  toast(<NamedLine line={line} />, description === undefined ? undefined : { description });
}
