import { FIELD_ERROR_CODES, type FieldErrorCode, type FieldErrors } from '@masaha/shared/core';
import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { AppError } from '../errors/index.ts';

export type RequestSource = 'body' | 'query' | 'params';

type Issue = z.core.$ZodIssue;

/**
 * Validates `req[source]` against the schema before the controller runs. On success the parsed
 * value (coerced, defaulted, stripped of unknown keys) replaces the raw one; on failure it throws
 * a `validation` error whose field errors are codes, never text (docs/backend/conventions.md §3).
 */
export function validate(schema: z.ZodType, source: RequestSource = 'body'): RequestHandler {
  return (req, _res, next) => {
    const input: unknown = req[source];
    const result = schema.safeParse(input);
    if (!result.success) throw toValidationError(result.error.issues, input);

    // Express 5 defines req.query as a getter, so the parsed value is set as an own property.
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}

/**
 * Maps Zod issues to the seven field-error codes. An issue about the input as a whole (no body, or
 * a body that is not an object) is a malformed request, not a field error.
 */
export function toValidationError(issues: readonly Issue[], input: unknown): AppError {
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
    if (issue.path.length === 0) return AppError.badRequest();
    add(issue.path, toFieldErrorCode(issue, input));
  }

  return AppError.validation(errors);
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
