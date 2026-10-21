import {
  updateSpaceSettingsSchema,
  type SpaceSettings,
  type UpdateSpaceSettingsRequest,
} from '@masaha/shared/space-settings';
import { useCopy } from '@shared/copy';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useEffect, useState } from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { SettingsCardView } from '../../types/SettingsCardView';
import { useSaveSettings } from '../useSaveSettings';

type SettingName = keyof UpdateSpaceSettingsRequest;

/**
 * What a card's request changes of the saved settings: each setting that differs, and, when one of
 * a group that is one choice differs, the whole group (`together`), as the contract asks.
 */
export function changesOf(
  request: UpdateSpaceSettingsRequest,
  settings: SpaceSettings,
  together: readonly (readonly SettingName[])[] = [],
): UpdateSpaceSettingsRequest {
  const names = (Object.keys(request) as SettingName[]).filter(
    (name) => request[name] !== undefined && request[name] !== settings[name],
  );
  for (const group of together) {
    if (group.some((name) => names.includes(name))) {
      names.push(...group.filter((name) => !names.includes(name) && name in request));
    }
  }
  return Object.fromEntries(names.map((name) => [name, request[name]]));
}

/**
 * One settings card's form and frame, ready to render: the card's fields from the saved settings
 * (`valuesOf`), checked in the browser by the contract's schema; «تغييرات غير محفوظة» while they
 * differ, and «تجاهل التغييرات»; a save sends only what changed (`changesOf`) and, when nothing
 * did, sends nothing and says «لم يتغيّر شيء»; the answer is the card's new state. An unchanged
 * card follows the settings as the server answers them. A refusal is worded in the owner's words.
 */
export function useSettingsCard<Values extends FieldValues>({
  spaceId,
  settings,
  id,
  title,
  description,
  valuesOf,
  fields,
  prepare,
  fieldLines,
  together,
}: {
  spaceId: number;
  settings: SpaceSettings;
  id: string;
  title: string;
  description?: string;
  valuesOf: (settings: SpaceSettings) => Values;
  fields: ServerFormOptions<Values, UpdateSpaceSettingsRequest>['fields'];
  /** The schema's input from the fields: a number as typed is read by the schema, and refused there. */
  prepare: (values: Values) => unknown;
  fieldLines?: ServerFormOptions<Values, UpdateSpaceSettingsRequest>['fieldLines'];
  together?: readonly (readonly SettingName[])[];
}) {
  const words = useCopy().spaceSettings;
  const save = useSaveSettings(spaceId);
  const [unchanged, setUnchanged] = useState(false);
  // A save's failure set aside by a discard, until the next save; a wait's count stays.
  const [failureCleared, setFailureCleared] = useState(false);
  const saved = valuesOf(settings);

  const form = useServerForm<Values, UpdateSpaceSettingsRequest>({
    schema: updateSpaceSettingsSchema,
    defaultValues: saved as DefaultValues<Values>,
    fields,
    prepare,
    submit: async (request) => {
      const changes = changesOf(request, settings, together);
      if (Object.keys(changes).length === 0) {
        setUnchanged(true);
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      const answer = await save.mutateAsync({ request: changes, card: title });
      form.form.reset(valuesOf(answer));
    },
    failureTitle: words.card.failed({ card: title }),
    fieldLines,
    failureLines: words.refusals,
  });
  const { isDirty } = form.form.formState;
  const savedKey = JSON.stringify(saved);

  // An unchanged card follows the settings as the server answers them.
  useEffect(() => {
    if (!form.form.formState.isDirty) form.form.reset(JSON.parse(savedKey) as Values);
  }, [savedKey, form.form]);

  const frame: SettingsCardView = {
    id,
    title,
    ...(description === undefined ? {} : { description }),
    unsaved: isDirty ? words.card.unsaved : null,
    failure: failureCleared && form.failure?.kind !== 'rateLimit' ? null : form.failure,
    save: {
      label: words.card.save,
      pending: form.isPending,
      blocked: form.blocked,
      submit: (event) => {
        setUnchanged(false);
        setFailureCleared(false);
        form.submit(event);
      },
    },
    discard: isDirty
      ? {
          label: words.card.discard,
          run: () => {
            setUnchanged(false);
            setFailureCleared(true);
            form.form.reset(saved);
          },
        }
      : null,
    note: unchanged && !isDirty ? words.card.unchanged : null,
  };

  return { frame, form };
}
