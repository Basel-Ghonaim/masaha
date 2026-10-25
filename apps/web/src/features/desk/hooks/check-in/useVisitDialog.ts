import { checkInVisitSchema, type CheckInVisitRequest } from '@masaha/shared/visits';
import type { Shift } from '@masaha/shared/spaces';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState, type BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { toastCheckedIn } from '../../components/toast/deskToasts';
import { currentShift } from '../../services/currentShift';
import { deskFailure } from '../../services/deskRefusal';
import { offersStudent, ratesFor } from '../../services/visitRates';
import { useVisitTermsQuery } from '../terms/useVisitTermsQuery';
import { useCheckInVisit } from './useCheckInVisit';

// The Select's value for «بدون وردية»: a Select item takes no empty value.
const NO_SHIFT = 'none';

type Values = { visitorName: string; audience: 'GENERAL' | 'STUDENT'; shiftId?: number | null };

/**
 * «تسجيل زيارة», ready to render: the visitor's name; «طالب» only where the terms carry student
 * rates for the chosen shift; «الوردية» only where the space has shifts, the current one chosen; the
 * rate the visit will copy, as the terms say; and, while the space is full, that it may still be
 * checked in. One opening is one intent: its key is kept across the transport's re-sends, a second
 * press and «إعادة المحاولة» after a lost answer (S4). Done, it closes and the toast names the
 * visitor with the server's warnings (S6).
 */
export function useVisitDialog({
  spaceId,
  shifts,
  full,
}: {
  spaceId: number;
  /** The space's shifts, as `spaces` reads them; none for a space with none, `null` while they load. */
  shifts: readonly Shift[] | null;
  /** The space is full now, as the desk's state now says. */
  full: boolean;
}) {
  const copy = useCopy();
  const words = copy.desk.visit;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const terms = useVisitTermsQuery(spaceId).data;
  const checkIn = useCheckInVisit(spaceId);
  const { key, renew } = useIntentKey();
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const spaceShifts = shifts ?? [];

  const shiftOf = (value: string) => (value === NO_SHIFT ? null : Number(value));
  // A space with shifts sends one, the current one first; a space with none sends no shift.
  const defaults = (visitorName = ''): Values => ({
    visitorName,
    audience: 'GENERAL',
    ...(spaceShifts.length > 0
      ? { shiftId: currentShift(spaceShifts, new Date())?.id ?? null }
      : {}),
  });

  const form = useServerForm<Values, CheckInVisitRequest>({
    schema: checkInVisitSchema,
    defaultValues: defaults(),
    fields: ['visitorName'],
    submit: async (request) => {
      try {
        const answer = await checkIn.mutateAsync({ body: request, key });
        setOpen(false);
        toastCheckedIn(request.visitorName, answer.meta?.warnings);
      } catch (error) {
        setRefusal(toAppError(error));
        throw error;
      }
    },
    failureTitle: words.failed,
    failureLines: copy.desk.refusals,
  });

  const [audience, chosenShift] = useWatch({
    control: form.form.control,
    name: ['audience', 'shiftId'],
  });
  const shiftId = chosenShift ?? null;
  const student = audience === 'STUDENT';
  const offered = terms !== undefined && offersStudent(terms, shiftId);
  const rates = terms === undefined ? null : ratesFor(terms, { shiftId, student });
  const price = (agorot: number) => isolate(priceText(agorot, language));
  // A new attempt starts with no failure, also when the browser's own check stops it.
  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const rate =
    rates === null
      ? ''
      : rates.hourAgorot !== null && rates.dayAgorot !== null && terms?.capAtDayPrice === true
        ? words.rate.hourCapped({ hour: price(rates.hourAgorot), day: price(rates.dayAgorot) })
        : rates.hourAgorot !== null
          ? words.rate.hour({ hour: price(rates.hourAgorot) })
          : rates.dayAgorot !== null
            ? words.rate.day({ day: price(rates.dayAgorot) })
            : words.rate.none;

  return {
    open,
    /**
     * A new opening is a new intent: a new key, and the form as it starts, with the name the desk's
     * search typed, if any.
     */
    setOpen: (next: boolean, visitorName?: string) => {
      if (next && !open) {
        renew();
        setRefusal(null);
        form.form.reset(defaults(visitorName));
      }
      setOpen(next);
    },
    title: words.title,
    noRecord: words.noRecord,
    rate,
    full: full ? words.full : null,
    fields: {
      name: { label: words.name, field: form.field('visitorName'), error: form.errors.visitorName },
      student: offered
        ? {
            label: words.student,
            checked: student,
            change: (checked: boolean) => {
              form.form.setValue('audience', checked ? 'STUDENT' : 'GENERAL');
            },
          }
        : null,
      shift:
        spaceShifts.length > 0
          ? {
              label: words.shift,
              optional: words.optional,
              value: shiftId === null ? NO_SHIFT : String(shiftId),
              options: [
                ...spaceShifts.map((shift) => ({
                  value: String(shift.id),
                  label: language === 'en' ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
                })),
                { value: NO_SHIFT, label: words.noShift },
              ],
              // A shift with no student rates takes «طالب» off (DI-41).
              change: (value: string) => {
                const next = shiftOf(value);
                form.form.setValue('shiftId', next);
                if (terms !== undefined && !offersStudent(terms, next)) {
                  form.form.setValue('audience', 'GENERAL');
                }
              },
            }
          : null,
    },
    submit: {
      label: full ? words.submitAnyway : words.submit,
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

/** «تسجيل زيارة», ready to render. */
export type VisitDialogView = ReturnType<typeof useVisitDialog>;
