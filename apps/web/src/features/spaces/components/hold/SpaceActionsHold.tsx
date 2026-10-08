import { FormFailure } from '@shared/forms';
import { useSpaceActionsHold } from '../../hooks/hold/useSpaceActionsHold';

/**
 * Why every row's menu waits, while a 429 counts down: the wait, counting, to set above the list.
 * Nothing otherwise.
 */
export function SpaceActionsHold() {
  const hold = useSpaceActionsHold();
  return hold.view === null ? null : <FormFailure view={hold.view} />;
}
