import {
  updateCustomerSchema,
  type Customer,
  type UpdateCustomerRequest,
} from '@masaha/shared/customers';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useState, type BaseSyntheticEvent } from 'react';
import { deskFailure } from '../../services/deskRefusal';
import { useEditCustomer } from './useEditCustomer';

type Values = { name: string; phone: string };

/**
 * «تعديل البيانات», ready to render: the customer's name and phone as loaded, the phone optional.
 * It sends only the fields that differ from the customer as loaded — a cleared phone as `null` — so
 * a late edit never puts back what another desk changed meanwhile (finding 123); nothing when
 * nothing differs, which it says. Sent once with no key, never again by itself (S3): a lost answer
 * says so and the user retries. A phone another customer holds is said on the phone. Done, the toast
 * names the customer as the answer saved them (S8).
 */
export function useEditDialog({
  spaceId,
  customer,
  onDone,
}: {
  spaceId: number;
  customer: Customer;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk.edit;
  const edit = useEditCustomer(spaceId, customer.id);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const [unchanged, setUnchanged] = useState(false);

  const form = useServerForm<Values, UpdateCustomerRequest>({
    schema: updateCustomerSchema,
    defaultValues: { name: customer.name, phone: customer.phone ?? '' },
    fields: ['name', 'phone'],
    // Only what differs from the customer as loaded; a phone left blank clears theirs.
    prepare: ({ name, phone }) => {
      const typed = phone.trim();
      return {
        ...(name.trim() !== customer.name && { name }),
        ...(typed === ''
          ? customer.phone !== null && { phone: null }
          : typed !== customer.phone && { phone: typed }),
      };
    },
    submit: async (body) => {
      if (Object.keys(body).length === 0) {
        setUnchanged(true);
        return;
      }
      try {
        const saved = await edit.mutateAsync(body);
        toast.success(words.done({ name: isolate(saved.name) }));
        onDone();
      } catch (error) {
        setRefusal(toAppError(error));
        throw error;
      }
    },
    failureTitle: words.failed,
    fieldLines: { phone: { not_unique: copy.errors.PHONE_TAKEN } },
    failureLines: copy.desk.refusals,
  });

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    setUnchanged(false);
    form.submit(event);
  };

  return {
    title: words.title,
    name: { label: words.name, field: form.field('name'), error: form.errors.name },
    phone: {
      label: words.phone,
      optional: words.optional,
      help: words.phoneHelp,
      field: form.field('phone'),
      error: form.errors.phone,
    },
    unchanged: unchanged ? words.nothingChanged : null,
    submit: {
      label: words.save,
      run: send,
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure: deskFailure(refusal, form.failure, {
      title: words.failed,
      lost: copy.desk.failure.lost,
      nothing: copy.desk.failure.nothing,
      retryLabel: copy.status.retry,
      retry: () => {
        send();
      },
    }),
  };
}

/** «تعديل البيانات», ready to render. */
export type EditDialogView = ReturnType<typeof useEditDialog>;
