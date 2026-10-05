import { toFieldErrors } from '@masaha/shared/core';
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
 * Maps Zod issues to the field-error codes, by the rule the web's forms share (`toFieldErrors`). An
 * issue about the input as a whole (no body, or a body that is not an object) is a malformed
 * request, not a field error.
 */
export function toValidationError(issues: readonly Issue[], input: unknown): AppError {
  const errors = toFieldErrors(issues, input);
  return errors ? AppError.validation(errors) : AppError.badRequest();
}
