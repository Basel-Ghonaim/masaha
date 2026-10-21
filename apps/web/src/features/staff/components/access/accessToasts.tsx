import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { RefusalText } from '@shared/forms';
import { isolate } from '@shared/localisation';

/**
 * Says that a staff member's access was not given back, naming them, with the refusal under it in
 * the owner's words. It stays until it is closed, so its reference can be read and reported.
 */
export function toastReactivateFailed(name: string, refusal: AppError) {
  // Worded when it lands, in the language the interface speaks then.
  const words = currentCopy().staff;
  const title = words.reactivate.failed({ name: isolate(name) });
  toast.error(title, {
    description: <RefusalText refusal={refusal} title={title} lines={words.refusals} />,
    duration: Infinity,
  });
}
