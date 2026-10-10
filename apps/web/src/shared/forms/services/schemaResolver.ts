import { toFieldErrors } from '@masaha/shared/core';
import { toNestErrors } from '@hookform/resolvers';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

type Issues = Parameters<typeof toFieldErrors>[0];

/** What the resolver needs of a schema from packages/shared: its `safeParse`. */
export type FormSchema<Output> = {
  safeParse: (
    input: unknown,
  ) => { success: true; data: Output } | { success: false; error: { issues: Issues } };
};

/**
 * Checks a form's values against a schema from packages/shared (ADR 0004), with the rule the API
 * answers with (`toFieldErrors`): each field's error `type` is the first field-error code it failed,
 * the code the server would send for the same value, so one catalogue line serves both. The form
 * submits the parsed value: trimmed, lowercased, normalised as the schema says.
 *
 * A form whose fields hold what the contract reads otherwise passes `prepare`, which builds the
 * schema's input from the fields' values; the codes are then read from that input, so a field the
 * preparation leaves out is `required`, never the code of the text it held.
 */
export function schemaResolver<Values extends FieldValues, Output>(
  schema: FormSchema<Output>,
  prepare?: (values: Values) => unknown,
): Resolver<Values, unknown, Output> {
  return (values, _context, options) => {
    const input = prepare ? prepare(values) : values;
    const result = schema.safeParse(input);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const fieldErrors = toFieldErrors(result.error.issues, input);
    // An issue about the values as a whole, such as a refinement of the whole object, is no field's.
    // It still fails the form, as the root error `root.schema`, so the form is never sent.
    if (fieldErrors === null) {
      const whole: FieldErrors = { root: { schema: { type: 'invalid_format' } } };
      return { values: {}, errors: toNestErrors<Values>(whole, options) };
    }
    const errors: FieldErrors = {};
    for (const [field, [code]] of Object.entries(fieldErrors)) {
      if (code !== undefined) errors[field] = { type: code };
    }
    return { values: {}, errors: toNestErrors<Values>(errors, options) };
  };
}
