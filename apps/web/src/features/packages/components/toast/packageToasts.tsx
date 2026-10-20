import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { RefusalText } from '@shared/forms';

/**
 * Says that a row's action failed, its title naming the package, with the refusal under it. It stays
 * until it is closed, so its reference can be read and reported.
 */
export function toastRowFailed(title: string, refusal: AppError) {
  toast.error(title, {
    description: <RefusalText refusal={refusal} title={title} />,
    duration: Infinity,
  });
}
