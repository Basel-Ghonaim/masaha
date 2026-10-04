import type { FieldErrorCode } from '@masaha/shared/core';

/**
 * What a field says, by the field-error code the server sends (docs/api/api-contract.md §3). The
 * server sends no limits, so these lines name none; a form that knows its rule may say more.
 */
export const VALIDATION = {
  required: 'This field is required.',
  too_short: 'This is too short.',
  too_long: 'This is too long.',
  invalid_format: 'This isn’t in a valid format.',
  out_of_range: 'This value is outside the allowed range.',
  not_unique: 'This value is already in use.',
  invalid_choice: 'Choose one of the available options.',
} as const satisfies Record<FieldErrorCode, string>;
