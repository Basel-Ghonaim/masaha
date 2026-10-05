import { FIELD_ERROR_CODES, type FieldErrorCode } from '@masaha/shared/core';
import type { Catalogue } from '@shared/copy';
import type { FieldError } from 'react-hook-form';

/** A form's own words for some codes of one field, where it knows the rule behind them. */
export type FieldLines = Partial<Record<FieldErrorCode, string>>;

function isFieldErrorCode(type: string): type is FieldErrorCode {
  return (FIELD_ERROR_CODES as readonly string[]).includes(type);
}

/**
 * What a field's error says: the form's own line for its code, else the catalogue's line for the
 * code. The code is the same whether the browser or the server found it, so one line serves both.
 * A type that is no field-error code reads as `invalid_format`, as the server reads a refinement that
 * names none. No error, no message.
 */
export function fieldMessage(
  copy: Catalogue,
  error: FieldError | undefined,
  lines: FieldLines = {},
): string | undefined {
  if (error === undefined) return undefined;
  const code = isFieldErrorCode(error.type) ? error.type : 'invalid_format';
  return lines[code] ?? copy.validation[code];
}
