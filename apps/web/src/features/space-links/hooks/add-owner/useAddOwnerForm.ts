import { emailSchema } from '@masaha/shared/core';
import { addOwnerSchema } from '@masaha/shared/space-links';
import { useCopy, type Catalogue } from '@shared/copy';
import { toAppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { useController, useWatch } from 'react-hook-form';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { lineParts } from '@shared/localisation';
import { useAddOwner } from './useAddOwner';
import { useEmailAccount } from './useEmailAccount';
import { useSpaceChoices } from '../useSpaceChoices';
import type { AddOwnerRequest } from '@masaha/shared/space-links';
import type { SpaceChoiceView } from '../../types/SpaceChoiceView';
import type { EmailAccountState } from '../../types/EmailAccountView';
import type { AddedOwnerView } from '../../types/TemporaryPasswordSlot';
import type { LinkTarget } from '../../types/LinkTarget';

type Values = { name: string; email: string; spaceId: number | null };

/** What the sheet says will happen: a new account, or the email's account checked, then upgraded. */
function noticeOf(
  account: EmailAccountState,
  lines: Catalogue['spaceLinks']['addOwner'],
  retryLabel: string,
) {
  switch (account.status) {
    case 'none':
      return { kind: 'create' as const, text: lines.willCreate };
    case 'reading':
      return { kind: 'checking' as const, text: lines.checkingAccount };
    case 'notFound':
      return { kind: 'notFound' as const, title: lines.hasAccount, text: lines.accountNotFound };
    case 'failed':
      return {
        kind: 'failed' as const,
        title: lines.hasAccount,
        text: lines.checkFailed,
        retry: { label: retryLabel, run: account.retry },
      };
    case 'found':
      return {
        kind: 'upgrade' as const,
        title: lines.hasAccount,
        account: account.account,
        labels: lines.account,
        confirm: lines.confirmAccount,
        text: lines.willUpgrade,
      };
  }
}

export function useAddOwnerForm({
  usersLink,
}: {
  /** The users list searched for `q`, as the page routes it: where a suspended account is restored. */
  usersLink: (q: string) => string;
}) {
  const copy = useCopy();
  const lines = copy.spaceLinks.addOwner;
  const addOwner = useAddOwner();
  // Open by its button, or by the address's `?sheet=add` (a link from a space's editor, the empty
  // list), which leaves the address once the sheet closes (D6.11).
  const [params, setParams] = useSearchParams();
  const [opened, setOpened] = useState(false);
  const open = opened || params.get('sheet') === 'add';
  const setOpen = (next: boolean) => {
    setOpened(next);
    if (!next && params.get('sheet') === 'add') {
      const left = new URLSearchParams(params);
      left.delete('sheet');
      setParams(left, { replace: true });
    }
  };
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [chosenSpace, setChosenSpace] = useState<SpaceChoiceView | null>(null);
  const [added, setAdded] = useState<AddedOwnerView | null>(null);
  // An email the server refused as an owner's already (`ALREADY_OWNER`, finding 83), and the link
  // dialog opened for that owner and the chosen space.
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  // An email the server refused as a suspended account's (`ACCOUNT_SUSPENDED`).
  const [suspendedEmail, setSuspendedEmail] = useState<string | null>(null);

  const spaceChoices = useSpaceChoices({ enabled: open });
  // The account the server said the remembered email has, as the users list shows it.
  const account = useEmailAccount(rememberedEmail);
  // The owner the refused email is, read by its exact email, for the link dialog.
  const owner = useEmailAccount(ownerEmail);

  // Read from the state of the render the admin sent the form from, so the upgrade is bound to the
  // email whose account was shown: an email edited after the confirm is sent with no upgrade.
  const submit = async (request: AddOwnerRequest) => {
    const spaceName = chosenSpace?.name ?? { text: '' };
    const confirmed =
      account.status === 'found' && request.email === rememberedEmail ? account.account : null;
    const upgrade = confirmed !== null;
    try {
      const answer = await addOwner.mutateAsync({
        request: { ...request, ...(upgrade ? { upgradeExisting: true } : {}) },
        spaceName,
        // An upgrade keeps the account's own name, the one the confirm showed, not the one typed.
        personName: confirmed?.name ?? request.name,
      });
      if (answer.temporaryPassword !== null) {
        setAdded({
          userId: answer.userId,
          name: request.name,
          email: request.email,
          temporaryPassword: answer.temporaryPassword,
        });
      }
      setOpen(false);
      setChosenSpace(null);
      setRememberedEmail(null);
      form.form.reset({ name: '', email: '', spaceId: null });
      addOwner.reset();
    } catch (error) {
      const refused = toAppError(error);
      if (refused.code === 'EMAIL_HAS_ACCOUNT' && !upgrade) {
        setRememberedEmail(request.email);
        return;
      }
      if (refused.code === 'ACCOUNT_SUSPENDED') {
        setSuspendedEmail(request.email);
        return;
      }
      if (refused.code === 'ALREADY_OWNER' && refused.details !== undefined) {
        setOwnerEmail(request.email);
        return;
      }
      throw error;
    }
  };

  const form = useServerForm<Values, AddOwnerRequest>({
    schema: addOwnerSchema,
    defaultValues: { name: '', email: '', spaceId: null },
    fields: ['name', 'email', 'spaceId'],
    submit,
    failureTitle: lines.failed,
    fieldLines: {
      name: { required: lines.fieldErrors.name.required },
      email: {
        required: lines.fieldErrors.email.required,
        invalid_format: lines.fieldErrors.email.invalid_format,
      },
      spaceId: {
        required: lines.fieldErrors.spaceId.required,
        invalid_choice: lines.fieldErrors.spaceId.invalid_choice,
      },
    },
    failureLines: lines.refusals,
    prepare: (values) => ({
      name: values.name,
      email: values.email,
      spaceId: values.spaceId ?? undefined,
    }),
  });

  // The email as the schema sends it, so the one the server answered for is recognised as typed.
  const watchedEmail = emailSchema.safeParse(
    useWatch({ control: form.form.control, name: 'email' }),
  ).data;
  // The upgrade is offered only once the email's account is shown and matches it exactly
  // (the 2026-10-18 approval): until then, or with no match, nothing can be sent for this email.
  const hasAccount = rememberedEmail !== null && watchedEmail === rememberedEmail;
  const upgrade = hasAccount && account.status === 'found';

  const spaceController = useController({ name: 'spaceId', control: form.form.control });

  const chooseSpace = (choice: SpaceChoiceView) => {
    setChosenSpace(choice);
    spaceController.field.onChange(Number(choice.value));
  };

  const spaceTriggerRef = spaceController.field.ref;

  const notice = noticeOf(hasAccount ? account : { status: 'none' }, lines, copy.status.retry);
  // The email refused as an owner's, while it is still the one typed.
  const isOwner = ownerEmail !== null && watchedEmail === ownerEmail;
  const ownerRow = owner.status === 'found' ? owner.row : null;

  return {
    open,
    setOpen,
    fields: {
      name: form.field('name'),
      email: form.field('email'),
    },
    errors: isOwner ? { ...form.errors, email: lines.alreadyOwner } : form.errors,
    /**
     * «اربطه بالمساحة», under the email an owner's already: the link dialog for that owner and the
     * chosen space, once their account is read.
     */
    linkOwner: isOwner
      ? {
          label: lines.linkThem,
          ready: ownerRow !== null,
          run: () => {
            if (ownerRow === null) return;
            setOpen(false);
            setLinkTarget({
              from: 'person',
              person: {
                id: ownerRow.id,
                name: ownerRow.name,
                role: 'OWNER',
                spaceIds: ownerRow.spaces.map((space) => space.id),
                deskIds: ownerRow.receptionSpaces.map((desk) => desk.id),
              },
              ...(chosenSpace !== null && { space: chosenSpace }),
            });
          },
        }
      : null,
    /**
     * «الحساب موقوف — استرجعه أولًا.», while the email refused as a suspended account's is the one
     * typed: «استرجعه أولًا» a link to the users list searched by that email.
     */
    suspended:
      suspendedEmail !== null && watchedEmail === suspendedEmail
        ? {
            ...lineParts(({ name }) => lines.suspended({ link: name })),
            link: { label: lines.restoreFirst, to: usersLink(suspendedEmail) },
          }
        : null,
    /** The link dialog opened from «اربطه بالمساحة», until it closes. */
    linkTarget,
    closeLink: () => {
      setLinkTarget(null);
      setOwnerEmail(null);
    },
    spaceTriggerRef,
    spaceChoices,
    chosenSpace,
    chooseSpace,
    notice,
    submit: {
      label: upgrade ? lines.upgrade : lines.create,
      run: form.submit,
      isPending: form.isPending || addOwner.isPending,
      blocked: form.blocked || (hasAccount && !upgrade),
    },
    failure: form.failure,
    added,
    done: () => {
      setAdded(null);
    },
    labels: {
      title: lines.title,
      description: lines.description,
      close: lines.close,
      name: lines.name,
      email: lines.email,
      emailPlaceholder: lines.emailPlaceholder,
      space: lines.space,
      chooseSpace: lines.chooseSpace,
    },
    upgrade,
  };
}
