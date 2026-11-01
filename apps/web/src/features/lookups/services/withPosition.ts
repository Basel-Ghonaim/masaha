import type { toFieldErrors } from '@masaha/shared/core';
import type { FormSchema } from '@shared/forms';

type Issue = Parameters<typeof toFieldErrors>[0][number];

/** A sheet's request, with the position typed for its row, when the sheet offers one. */
export type Positioned<Request> = Request & { position?: number };

/** A list of more than this many rows offers a row's position in its sheet. */
const ARROWS_ENOUGH = 10;

/** Whether a list of `count` rows offers a row's position in its sheet, not its arrows alone. */
export function offersPosition(count: number): boolean {
  return count > ARROWS_ENOUGH;
}

/**
 * `schema`, with a row's position in a list of `count` beside it: a whole number from 1 to `count`.
 * The position is read from the input as prepared: `undefined` where the sheet offers none, `null`
 * for a blank field (`required`), a number, or the text typed (`invalid_format`). Its code lands on
 * the field `position` as a refinement names it, so the browser refuses it as it refuses the names.
 * The contract's schema never sees it: the position is no field of the row, but of its list's order.
 */
export function withPosition<Request>(
  schema: FormSchema<Request>,
  count: number,
): FormSchema<Positioned<Request>> {
  return {
    safeParse: (input) => {
      const { position, ...rest } = input as { position?: unknown };
      const parsed = schema.safeParse(rest);
      const code =
        position === undefined
          ? null
          : position === null
            ? 'required'
            : typeof position !== 'number'
              ? 'invalid_format'
              : position < 1 || position > count
                ? 'out_of_range'
                : null;
      const issues: Issue[] = parsed.success ? [] : [...parsed.error.issues];
      if (code !== null) {
        issues.push({ code: 'custom', path: ['position'], message: code, params: { code } });
      }
      if (parsed.success && issues.length === 0) {
        return {
          success: true,
          // No position typed: the request as the contract's schema made it, with none.
          data:
            typeof position === 'number'
              ? { ...parsed.data, position }
              : (parsed.data as Positioned<Request>),
        };
      }
      return { success: false, error: { issues } };
    },
  };
}
