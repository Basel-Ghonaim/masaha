import type { ProfileValues } from '../types/ProfileValues';
import { OPTIONAL_TEXTS, profileInput } from './profileInput';

/**
 * The profile the contract's schema reads when it is edited: as when it is added, except that an
 * optional text left blank is `null`, which clears it, rather than left out, which would keep it.
 */
export function profileEditInput(values: ProfileValues): Record<string, unknown> {
  const input = profileInput(values);
  for (const field of OPTIONAL_TEXTS) {
    input[field] ??= null;
  }
  return input;
}
