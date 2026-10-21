import {
  placeholdersIn,
  REMINDER_AMOUNT,
  REMINDER_PLACEHOLDERS,
  type SpaceSettings,
} from '@masaha/shared/space-settings';
import { CATALOGUES, useCopy } from '@shared/copy';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useRef, type RefObject } from 'react';
import { useWatch } from 'react-hook-form';
import { reminderPreview } from '../../services/reminderPreview';
import { useSettingsCard } from '../card/useSettingsCard';

type ReminderValues = { reminderTemplate: string };

/**
 * Whether a text is the catalogue's reminder, in any language: read when the form is checked, so the
 * default shown after a change of language still counts as the default.
 */
const isDefaultText = (text: string) =>
  Object.values(CATALOGUES).some(
    (catalogue) => catalogue.spaceSettings.reminder.defaultText === text,
  );

/** The amount the preview shows: 150 shekels. */
const SAMPLE_AGOROT = 15_000;

/**
 * The «رسالة التذكير» card, ready to render: the space's reminder, or the catalogue's text while it
 * keeps none; three buttons that insert `{الاسم}`, `{المبلغ}` and `{المساحة}` at the caret; a
 * preview, the placeholders filled for a sample customer and the space (`spaceName`); and
 * «استعادة النص الافتراضي», which puts the catalogue's text back. The catalogue's text left as it
 * is is saved as none (`null`), so the space follows the catalogue. A refusal says which rule was
 * broken: the amount missing, a placeholder off the list (named), the length, a character.
 */
export function useReminderCard({
  spaceId,
  settings,
  spaceName,
  textareaRef,
}: {
  spaceId: number;
  settings: SpaceSettings;
  spaceName: string;
  /** The message's field, created by the component, where an insert puts its token. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const copy = useCopy();
  const words = copy.spaceSettings.reminder;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const defaultText = words.defaultText;
  const saved = settings.reminderTemplate;
  // The catalogue's text is shown: the space keeps none, or the owner restored it. Read only when
  // the form is checked, by the resolver, which keeps the first preparation it is given.
  const usesDefault = useRef(saved === null);

  useEffect(() => {
    usesDefault.current = saved === null;
  }, [saved]);

  const { frame, form } = useSettingsCard<ReminderValues>({
    spaceId,
    settings,
    id: 'reminder',
    title: words.title,
    description: words.description,
    valuesOf: (current) => ({ reminderTemplate: current.reminderTemplate ?? defaultText }),
    fields: ['reminderTemplate'],
    prepare: ({ reminderTemplate }) => ({
      reminderTemplate:
        usesDefault.current && isDefaultText(reminderTemplate) ? null : reminderTemplate,
    }),
  });
  const { control, setValue } = form.form;
  const text = useWatch({ control, name: 'reminderTemplate' });
  const binding = form.field('reminderTemplate');

  const error = (() => {
    const lines = words.fieldErrors;
    switch (form.codes.reminderTemplate) {
      case 'invalid_choice': {
        const token = placeholdersIn(text).find(
          (one) => !(REMINDER_PLACEHOLDERS as readonly string[]).includes(one),
        );
        return lines.unknown({ token: isolate(token ?? '') });
      }
      case 'invalid_format':
        return text.includes(REMINDER_AMOUNT) ? lines.badCharacters : lines.missingAmount;
      case 'too_short':
        return lines.too_short;
      case 'too_long':
        return lines.too_long;
      default:
        return form.errors.reminderTemplate;
    }
  })();

  const [name, amount, space] = REMINDER_PLACEHOLDERS;
  /** Puts `token` at the caret of the message's field, as it is when the button is pressed. */
  const insert = (token: string, field: HTMLTextAreaElement | null) => {
    const at = field?.selectionStart ?? text.length;
    const to = field?.selectionEnd ?? at;
    setValue('reminderTemplate', text.slice(0, at) + token + text.slice(to), { shouldDirty: true });
    // The value is the field's at once: the caret goes after the token, the focus back to it.
    const caret = at + token.length;
    field?.focus();
    field?.setSelectionRange(caret, caret);
  };

  return {
    frame,
    text: {
      label: words.text,
      binding: {
        ...binding,
        ref: (element: HTMLTextAreaElement | null) => {
          binding.ref(element);
          textareaRef.current = element;
        },
      },
      error,
    },
    insert: {
      label: words.insert,
      disabled: form.isPending,
      tokens: [
        { token: name, label: words.insertNamed.name },
        { token: amount, label: words.insertNamed.amount },
        { token: space, label: words.insertNamed.space },
      ].map(({ token, label }) => ({
        token,
        label,
        run: (field: HTMLTextAreaElement | null) => {
          insert(token, field);
        },
      })),
    },
    preview: {
      label: words.preview,
      text: reminderPreview(text, {
        name: words.sampleName,
        amount: priceText(SAMPLE_AGOROT, language),
        space: spaceName,
      }),
    },
    restore: {
      label: words.restore,
      disabled: form.isPending,
      run: () => {
        usesDefault.current = true;
        setValue('reminderTemplate', defaultText, { shouldDirty: true });
      },
    },
  };
}
