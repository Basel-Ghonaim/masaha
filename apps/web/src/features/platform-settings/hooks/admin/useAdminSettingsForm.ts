import { currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { CardFrameView } from '../../types/CardFrameView';
import { platformSettingsKeys, type AdminSettingsCard } from '../queryKeys';

/**
 * One of the admin's cards once read, its form and frame ready to render (AD-029): its fields from
 * the saved values (`valuesOf`), checked in the browser by the contract's schema; «حفظ» always
 * enabled (P10), sending the card whole; «تغييرات غير محفوظة» and «تجاهل التغييرات» while the
 * fields differ; a refusal inside the card only, the 429 counted down; a save's answer is the card's
 * new saved values, kept as its query's, with the toast «حُفظت الإعدادات», and the keys `alsoStale`
 * names read again (the public contact's).
 */
export function useAdminSettingsForm<Values extends FieldValues, Request, Answer>({
  card,
  title,
  description,
  saved,
  valuesOf,
  schema,
  fields,
  prepare,
  fieldLines,
  save,
  alsoStale = [],
}: {
  card: AdminSettingsCard;
  title: string;
  description: string;
  saved: Answer;
  valuesOf: (answer: Answer) => Values;
  schema: ServerFormOptions<Values, Request>['schema'];
  fields: ServerFormOptions<Values, Request>['fields'];
  prepare?: (values: Values) => unknown;
  fieldLines?: ServerFormOptions<Values, Request>['fieldLines'];
  save: (request: Request) => Promise<Answer>;
  alsoStale?: readonly QueryKey[];
}) {
  const words = useCopy().platformSettings.admin;
  const client = useQueryClient();
  // A save's failure set aside by a discard, until the next save; a wait's count stays.
  const [failureCleared, setFailureCleared] = useState(false);
  const mutation = useMutation<Answer, AppError, Request>({
    mutationFn: save,
    onSuccess: (answer) => {
      client.setQueryData(platformSettingsKeys.admin(card), answer);
      for (const key of alsoStale) void client.invalidateQueries({ queryKey: key });
      toast(currentCopy().platformSettings.admin.saved);
    },
  });

  const form = useServerForm<Values, Request>({
    schema,
    defaultValues: valuesOf(saved) as DefaultValues<Values>,
    fields,
    ...(prepare !== undefined && { prepare }),
    submit: async (request) => {
      const answer = await mutation.mutateAsync(request);
      form.form.reset(valuesOf(answer));
    },
    failureTitle: words.saveFailed({ card: title }),
    ...(fieldLines !== undefined && { fieldLines }),
  });
  const { isDirty } = form.form.formState;

  const frame: CardFrameView = {
    id: card,
    title,
    description,
    unsaved: isDirty ? words.unsaved : null,
    failure: failureCleared && form.failure?.kind !== 'rateLimit' ? null : form.failure,
    save: {
      label: words.save,
      pending: form.isPending,
      blocked: form.blocked,
      submit: (event) => {
        setFailureCleared(false);
        form.submit(event);
      },
    },
    discard: isDirty
      ? {
          label: words.discard,
          run: () => {
            setFailureCleared(true);
            form.form.reset(valuesOf(saved));
          },
        }
      : null,
  };

  return { frame, form };
}
