import type { z } from 'zod';

import { FIELD_ERROR_CODES, type FieldErrorCode, type FieldErrors } from './errors.ts';

// The one rule from a schema's failures to the contract's field-error codes (docs/api/api-contract.md
// §3). The API answers a request with it, and the web's forms check their fields with it, so the
// browser and the server name a failed rule with the same code.

type Issue = z.core.$ZodIssue;

/**
 * Maps Zod issues to the seven field-error codes, keyed by each field's dotted path. An issue about
 * the input as a whole (no input, or input that is not an object) is no field's: the answer is then
 * `null`.
 */
export function toFieldErrors(issues: readonly Issue[], input: unknown): FieldErrors | null {
  const errors: FieldErrors = {};
  const add = (path: readonly PropertyKey[], code: FieldErrorCode) => {
    const field = path.map(String).join('.');
    const codes = (errors[field] ??= []);
    if (!codes.includes(code)) codes.push(code);
  };

  for (const issue of issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) add([...issue.path, key], 'invalid_format');
      continue;
    }
    if (issue.path.length === 0) return null;
    add(issue.path, toFieldErrorCode(issue, input));
  }

  return errors;
}

function toFieldErrorCode(issue: Issue, input: unknown): FieldErrorCode {
  switch (issue.code) {
    case 'invalid_type':
      return valueAt(input, issue.path) === undefined ? 'required' : 'invalid_format';
    case 'too_small':
      return isLength(issue.origin) ? 'too_short' : 'out_of_range';
    case 'too_big':
      return isLength(issue.origin) ? 'too_long' : 'out_of_range';
    case 'not_multiple_of':
      return 'out_of_range';
    case 'invalid_value':
      return 'invalid_choice';
    case 'custom':
      // A refinement names its code in `params`, e.g. `{ params: { code: 'not_unique' } }`.
      return isFieldErrorCode(issue.params?.code) ? issue.params.code : 'invalid_format';
    default:
      return 'invalid_format';
  }
}

// Strings, arrays, sets and files are measured by length or size; numbers, bigints and dates by value.
function isLength(origin: string) {
  return origin === 'string' || origin === 'array' || origin === 'set' || origin === 'file';
}

function isFieldErrorCode(value: unknown): value is FieldErrorCode {
  return FIELD_ERROR_CODES.includes(value as FieldErrorCode);
}

function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let value = input;
  for (const key of path) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}
