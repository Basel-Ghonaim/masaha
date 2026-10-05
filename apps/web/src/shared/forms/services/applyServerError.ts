import type { AppError } from '@shared/errors';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Puts a refused submission on the form. The server's field errors (`errors`: field → codes) land
 * on the form's own fields, each with its first code. What lands on no field is the form's to show:
 * the answer is that failure, whose `code ?? type` names its message, or `null` when every word of it
 * is on a field.
 */
export function applyServerError<Values extends FieldValues>(
  error: AppError,
  setError: UseFormSetError<Values>,
  fields: readonly Path<Values>[],
): AppError | null {
  let placed = 0;
  for (const field of fields) {
    const [code] = error.errors?.[field] ?? [];
    if (code === undefined) continue;
    setError(field, { type: code });
    placed += 1;
  }
  return placed > 0 ? null : error;
}
