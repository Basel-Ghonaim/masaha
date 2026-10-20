import { addStaffSchema, type AddStaffRequest } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useState } from 'react';
import { useAddStaff } from './useAddStaff';

type Values = { name: string; email: string };

/** A reception account just created, with its temporary password, handed on once. */
export type AddedStaffView = {
  person: { userId: number; name: string; email: string };
  password: string;
};

/**
 * The add sheet's form, ready to render: open or closed, the name and the email, what adding does
 * said before the submit (a new account, its temporary password shown once, never an existing
 * account linked), and the submit. Added: once the list has arrived again, the sheet closes and is
 * reset, the answer leaves the mutation, and the account goes to `onAdded`. An email that already
 * has an account is refused on the email, in the owner's words; a 403 says only that it is no longer
 * open to them; too many attempts count down.
 */
export function useAddStaffForm({
  spaceId,
  onAdded,
}: {
  spaceId: number;
  onAdded: (added: AddedStaffView) => void;
}) {
  const words = useCopy().staff.add;
  const add = useAddStaff(spaceId);
  const [open, setOpen] = useState(false);

  const form = useServerForm<Values, AddStaffRequest>({
    schema: addStaffSchema,
    defaultValues: { name: '', email: '' },
    fields: ['name', 'email'],
    submit: async (request) => {
      const answer = await add.mutateAsync(request);
      setOpen(false);
      form.form.reset({ name: '', email: '' });
      // The password leaves the mutation's state: the page's dialog holds it alone.
      add.reset();
      onAdded({
        person: { userId: answer.userId, name: request.name, email: request.email },
        password: answer.temporaryPassword,
      });
    },
    failureTitle: words.failed,
    fieldLines: words.fieldErrors,
    failureLines: words.refusals,
  });

  return {
    open,
    setOpen,
    labels: {
      open: words.open,
      title: words.title,
      description: words.description,
      close: words.close,
      name: words.name,
      email: words.email,
    },
    fields: { name: form.field('name'), email: form.field('email') },
    errors: form.errors,
    notice: words.notice,
    failure: form.failure,
    submit: {
      label: words.submit,
      run: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
    },
  };
}

/** The add sheet's form, ready to render. */
export type AddStaffFormView = ReturnType<typeof useAddStaffForm>;
