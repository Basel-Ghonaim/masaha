import {
  ANNOUNCEMENT_TYPES,
  createAnnouncementSchema,
  editAnnouncementSchema,
  type AnnouncementState,
  type CreateAnnouncementRequest,
  type EditAnnouncementRequest,
} from '@masaha/shared/announcements';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm, type FormFailureView } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useState, type BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { toastWritten } from '../../components/toast/announcementToasts';
import { periodText } from '../../services/periodText';
import { createRequestOf, editRequestOf, instantOf, valuesOf } from '../../services/sheetRequest';
import { textOf } from '../../services/textOf';
import { typeView } from '../../services/typeView';
import type { PublicItemView } from '../../types/PublicItemView';
import type { SheetEntry } from '../../types/SheetEntry';
import type { SheetValues } from '../../types/SheetValues';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';
import { useCreateAnnouncement } from './useCreateAnnouncement';
import { useEditAnnouncement } from './useEditAnnouncement';

type Body = CreateAnnouncementRequest | EditAnnouncementRequest;

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting).
const LOCALES = { ar: 'ar-u-nu-latn', en: 'en-GB' } as const;

/** A Gaza date as the date's trigger says it, «29 سبتمبر 2026» (DI-22), never moved by a zone. */
const dateText = (date: string, language: 'ar' | 'en') => {
  const day = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(day.getTime())
    ? ''
    : new Intl.DateTimeFormat(LOCALES[language], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(day);
};

/** An instant that can be read, else none. */
const readable = (instant: string) => (Number.isNaN(Date.parse(instant)) ? null : instant);

/**
 * The announcement sheet (screen 18), ready to render, for its entry: a new announcement, or an edit
 * of one running or upcoming. The type with its hint; the Arabic text, required; the English one,
 * optional; «يبدأ: الآن · في موعد» (a new one only) and «ينتهي: في موعد · بلا موعد», each date and time
 * on Gaza's clock (S9); a closure's line (DI-29); the preview of the space's page (DI-25). One form,
 * checked with the contract's schemas: a refusal of the period lands on its time field (DI-30), and
 * an edit sends only what changed — nothing changed is said, and nothing is sent.
 *
 * The post carries one `Idempotency-Key` per opening (S4): the sheet is mounted for one opening, so
 * the key is kept across the transport's re-sends, a second press, «إعادة المحاولة» and an edit of
 * the form; no answer says a retry will not publish twice. An edit is sent once with no key.
 * `CLOSURE_EXTENDED`, a 404 and a 403 are worded, and the list is read again on a 404 or a 409. Done,
 * the toast names the tab it went to, with «عرض» (`showTab`, DI-24), and `onClose` closes the sheet.
 */
export function useAnnouncementSheet({
  spaceId,
  entry,
  showTab,
  onClose,
}: {
  spaceId: number;
  entry: SheetEntry;
  showTab: (state: AnnouncementState) => void;
  onClose: () => void;
}) {
  const copy = useCopy();
  const words = copy.announcements;
  const sheet = words.sheet;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  // One key for this opening: the sheet is mounted anew for each one.
  const { key } = useIntentKey();
  const create = useCreateAnnouncement(spaceId);
  const edit = useEditAnnouncement(spaceId);
  const { settle } = useAnnouncementsWrite();
  const loaded = entry.mode === 'edit' ? entry.announcement : null;
  const [initial] = useState(() =>
    valuesOf(loaded, new Date(), entry.mode === 'new' ? entry.type : undefined),
  );
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const [unchanged, setUnchanged] = useState(false);

  const send = async (body: Body) => {
    if (loaded !== null && Object.keys(body).length === 0) {
      setUnchanged(true);
      return;
    }
    try {
      const answer =
        loaded === null
          ? await create.mutateAsync({ body: body as CreateAnnouncementRequest, key })
          : await edit.mutateAsync({ id: loaded.id, body });
      toastWritten(loaded === null ? 'published' : 'saved', answer.state, showTab);
      onClose();
    } catch (error) {
      const failure = toAppError(error);
      // Gone, or refused for its state: the list is read again, so it shows the truth.
      if (failure.status === 404 || failure.status === 409) settle(spaceId);
      setRefusal(failure);
      throw error;
    }
  };

  const form = useServerForm<SheetValues, Body>({
    schema: loaded === null ? createAnnouncementSchema : editAnnouncementSchema,
    defaultValues: initial,
    fields: ['type', 'textAr', 'textEn', 'startsAt', 'endsAt'],
    prepare: (values) =>
      loaded === null ? createRequestOf(values) : editRequestOf(values, loaded),
    submit: send,
    failureTitle: sheet.failed,
    fieldLines: {
      // A text left blank is a text missing, not a short one.
      textAr: { required: sheet.fields.textArRequired, too_short: sheet.fields.textArRequired },
      startsAt: { out_of_range: sheet.fields.startRange },
      endsAt: { out_of_range: sheet.fields.endRange },
    },
    failureLines: { not_found: sheet.gone, forbidden: copy.desk.refusals.forbidden },
  });

  const run = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    setUnchanged(false);
    form.submit(event);
  };
  const { control, setValue } = form.form;
  const values = useWatch({ control }) as SheetValues;
  const dirty = { shouldDirty: true };

  // No answer: the post may have landed, and its key makes a retry safe; an edit is said as lost.
  const failure: FormFailureView | null =
    refusal !== null && (refusal.type === 'network' || refusal.type === 'timeout')
      ? {
          kind: 'offline',
          title: sheet.failed,
          message: loaded === null ? sheet.lost : copy.errors[refusal.type],
          retryLabel: copy.status.retry,
          retry: () => {
            run();
          },
        }
      : form.failure;

  const now = new Date();
  const type = typeView(values.type, words);
  const startsAt =
    values.startMode === 'now' ? now.toISOString() : instantOf(values.startDate, values.startsAt);
  const endsAt = values.endMode === 'none' ? null : instantOf(values.endDate, values.endsAt);
  const start = readable(startsAt);
  const item: PublicItemView = {
    type: { label: type.label, tone: type.tone },
    period:
      start === null || (endsAt !== null && readable(endsAt) === null)
        ? ''
        : periodText({ startsAt: start, endsAt }, language, now, words.period),
    text: textOf(
      { textAr: values.textAr, textEn: values.textEn.trim() === '' ? null : values.textEn },
      language,
    ),
  };
  const date = (name: 'startDate' | 'endDate') => ({
    label: sheet.date,
    text: dateText(values[name], language),
    value: values[name],
    choose: (value: string) => {
      setValue(name, value, dirty);
    },
    panel: sheet.chooseDate,
    previous: sheet.previousMonth,
    next: sheet.nextMonth,
  });

  return {
    title: loaded === null ? sheet.new : sheet.edit,
    description: sheet.description,
    closeLabel: sheet.close,
    type: {
      label: sheet.type,
      value: values.type,
      options: ANNOUNCEMENT_TYPES.map((value) => ({ value, ...typeView(value, words) })),
      choose: (value: string) => {
        const chosen = ANNOUNCEMENT_TYPES.find((each) => each === value);
        if (chosen !== undefined) setValue('type', chosen, dirty);
      },
      error: form.errors.type,
    },
    textAr: {
      label: sheet.textAr,
      helper: sheet.textArHelper,
      field: form.field('textAr'),
      error: form.errors.textAr,
    },
    textEn: {
      label: sheet.textEn,
      optional: sheet.optional,
      helper: sheet.textEnHelper,
      field: form.field('textEn'),
      error: form.errors.textEn,
    },
    start: {
      label: sheet.starts,
      // An edit moves the start by its date and time; «الآن» is a new one's only.
      modes:
        loaded === null
          ? [
              { value: 'now', label: sheet.now },
              { value: 'at', label: sheet.at },
            ]
          : null,
      mode: values.startMode,
      choose: (value: string) => {
        if (value === 'now' || value === 'at') setValue('startMode', value, dirty);
      },
      at: values.startMode === 'at',
      date: date('startDate'),
      time: { label: sheet.time, field: form.field('startsAt'), error: form.errors.startsAt },
    },
    end: {
      label: sheet.ends,
      modes: [
        { value: 'at', label: sheet.at },
        { value: 'none', label: sheet.noEnd },
      ],
      mode: values.endMode,
      choose: (value: string) => {
        if (value === 'at' || value === 'none') setValue('endMode', value, dirty);
      },
      at: values.endMode === 'at',
      date: date('endDate'),
      time: { label: sheet.time, field: form.field('endsAt'), error: form.errors.endsAt },
      help: values.endMode === 'none' ? sheet.noEndHelp : null,
    },
    closure: values.type === 'CLOSURE' ? sheet.closure : null,
    preview: {
      label: sheet.preview,
      item,
      closure: values.type === 'CLOSURE',
      notice: words.public.notice({ period: item.period }),
    },
    submit: {
      label: loaded === null ? sheet.publish : sheet.save,
      run,
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure,
    /** An edit that changed nothing: said, and nothing sent. */
    notice: unchanged ? sheet.nothingChanged : null,
  };
}

/** The announcement sheet, ready to render. */
export type AnnouncementSheetView = ReturnType<typeof useAnnouncementSheet>;
