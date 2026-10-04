import { FIELD_ERROR_CODES, type FieldErrorCode } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import {
  get,
  useForm,
  type DefaultValues,
  type FieldError,
  type FieldValues,
  type Path,
  type UseFormRegisterReturn,
  type UseFormReturn,
} from 'react-hook-form';
import type { FormFailureView } from '../types/FormFailureView';
import { applyServerError } from '../services/applyServerError';
import { fieldMessage, type FieldLines } from '../services/fieldMessage';
import { schemaResolver, type FormSchema } from '../services/schemaResolver';
import { useFormFailure } from './useFormFailure';

export type ServerFormOptions<Values extends FieldValues, Request> = {
  /** The contract's schema from packages/shared: the browser checks with the rule the server uses. */
  schema: FormSchema<Request>;
  defaultValues: DefaultValues<Values>;
  /** The fields in the order the form shows them: a server error focuses the first it names. */
  fields: readonly Path<Values>[];
  /** Sends the parsed values to the server; a rejection is the server's refusal. */
  submit: (request: Request) => Promise<unknown>;
  /** The form's title for a refusal, such as "Couldn't sign in". */
  failureTitle: string;
  /** The form's own words for some codes of some fields, where it knows the rule behind them. */
  fieldLines?: Partial<Record<Path<Values>, FieldLines>>;
};

export type ServerForm<Values extends FieldValues, Request> = {
  /** A field's bindings for the layer's controls, disabled while the form is sent. */
  field: (name: Path<Values>) => UseFormRegisterReturn<Path<Values>> & { disabled: boolean };
  /** Sends the form: checks it, then calls the server. A form's `onSubmit`, or a retry. */
  submit: (event?: BaseSyntheticEvent) => void;
  isPending: boolean;
  /** The submit waits out too many attempts. */
  blocked: boolean;
  /** Each field's error, as text. */
  errors: Partial<Record<Path<Values>, string>>;
  /** Why the submission failed, ready to render with `FormFailure`. */
  failure: FormFailureView | null;
  /** Each field's error code, for the feature's hook to decide on; never handed to a component. */
  codes: Partial<Record<Path<Values>, FieldErrorCode>>;
  /** The react-hook-form instance, for the feature's hook (`useWatch`); never handed to a component. */
  form: UseFormReturn<Values, unknown, Request>;
};

function codeOf(error: FieldError | undefined): FieldErrorCode | undefined {
  const type = error?.type;
  return FIELD_ERROR_CODES.find((code) => code === type);
}

/**
 * The one form pattern (docs/frontend/architecture.md §3): a form checked in the browser with the
 * contract's schema, sent with the server call the feature passes, and a refusal put on the form,
 * on its fields or as its failure. It returns what a component renders, ready: the field bindings,
 * the submit, the pending and blocked states, each field's error as text, and the failure as a view.
 */
export function useServerForm<Values extends FieldValues, Request>({
  schema,
  defaultValues,
  fields,
  submit,
  failureTitle,
  fieldLines = {},
}: ServerFormOptions<Values, Request>): ServerForm<Values, Request> {
  const copy = useCopy();
  const [resolver] = useState(() => schemaResolver<Values, Request>(schema));
  const form = useForm<Values, unknown, Request>({ defaultValues, resolver });
  const [refusal, setRefusal] = useState<AppError | null>(null);
  // The first field a refusal names, focused once the fields are enabled again.
  const [focusTarget, setFocusTarget] = useState<Path<Values> | null>(null);

  const send = form.handleSubmit(async (request) => {
    try {
      await submit(request);
    } catch (error) {
      const refused = toAppError(error);
      setFocusTarget(fields.find((name) => refused.errors?.[name]?.length) ?? null);
      setRefusal(applyServerError(refused, form.setError, fields));
    }
  });
  // The last failure goes as the new attempt starts.
  const sendAgain = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    setFocusTarget(null);
    void send(event);
  };

  const { view, blocked } = useFormFailure(refusal, {
    title: failureTitle,
    retry: () => {
      sendAgain();
    },
  });
  const isPending = form.formState.isSubmitting;
  useEffect(() => {
    if (!isPending && focusTarget !== null) form.setFocus(focusTarget);
  }, [isPending, focusTarget, form]);
  const errors: Partial<Record<Path<Values>, string>> = {};
  const codes: Partial<Record<Path<Values>, FieldErrorCode>> = {};
  for (const name of fields) {
    const error = get(form.formState.errors, name) as FieldError | undefined;
    const message = fieldMessage(copy, error, fieldLines[name]);
    if (message !== undefined) errors[name] = message;
    const code = codeOf(error);
    if (code !== undefined) codes[name] = code;
  }

  return {
    field: (name) => ({ ...form.register(name), disabled: isPending }),
    submit: sendAgain,
    isPending,
    blocked,
    errors,
    failure: view,
    codes,
    form,
  };
}
