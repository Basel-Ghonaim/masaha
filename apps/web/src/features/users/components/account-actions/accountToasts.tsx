import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { RefusalText } from '@shared/forms';
import { isolate } from '@shared/localisation';

/**
 * Says that an account was not restored, naming the person, with the refusal under it. It stays
 * until it is closed, so its reference can be read and reported.
 */
export function toastRestoreFailed(name: string, refusal: AppError) {
  const title = currentCopy().users.accountActions.restoreFailed({ name: isolate(name) });
  toast.error(title, {
    description: <RefusalText refusal={refusal} title={title} />,
    duration: Infinity,
  });
}
