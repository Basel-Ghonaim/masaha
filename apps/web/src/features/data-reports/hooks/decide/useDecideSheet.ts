import {
  decideReportSchema,
  type DataReportDecision,
  type DecideReportRequest,
} from '@masaha/shared/data-reports';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm, type FormFailureView } from '@shared/forms';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { toastDecided } from '../../components/toast/toastDecided';
import { fieldLabel, messageView, reportDay, statusView } from '../../services/reportView';
import type { DecideTarget } from '../../types/DecideTarget';
import { useDecideReport } from './useDecideReport';

type Values = { status: DataReportDecision; note: string };

/**
 * The decision sheet, ready to render (screen 23): the report — its field, «زائر» and its day, its
 * status, its message —, «تعديل الحقل» to where the field is edited (DI-33), and, while it is open,
 * the reply and the two decisions: «تم التصحيح» with a reply or none, «لم يُعتمد» with one required —
 * its helper says so first, and a blank one is focused with its line, nothing sent (DI-36). Sent once,
 * with no key, never again by itself (S4): no answer says a retry is safe. A decided report is
 * read-only: its decision and its reply, or «بلا ردّ», and no buttons (DI-37). `REPORT_ALREADY_DECIDED`
 * and a report gone are worded, and the list read again, the sheet then read-only; a 403 says the
 * space is no longer open to the user (S5). Done, it closes and its toast says where the report went,
 * with «عرض» (`showDecided`, DI-41).
 */
export function useDecideSheet({
  target,
  editLink,
  showDecided,
  onClose,
}: {
  target: DecideTarget;
  /** Where the report's field is edited, as the page routes it; none when it has no place. */
  editLink: string | null;
  showDecided: () => void;
  onClose: () => void;
}) {
  const copy = useCopy();
  const words = copy.dataReports;
  const sheet = words.sheet;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const { report } = target;
  const deciding = useDecideReport(target);
  const [refusal, setRefusal] = useState<AppError | null>(null);

  const form = useServerForm<Values, DecideReportRequest>({
    schema: decideReportSchema,
    defaultValues: { status: 'RESOLVED', note: '' },
    fields: ['note'],
    // A blank reply is no reply: «تم التصحيح» sends its status alone, «لم يُعتمد» is `required`.
    prepare: (values) => ({
      status: values.status,
      note: values.note.trim() === '' ? undefined : values.note,
    }),
    submit: async (body) => {
      try {
        await deciding.mutateAsync(body);
        toastDecided(body.status, { replied: body.note !== undefined, show: showDecided });
        onClose();
      } catch (error) {
        setRefusal(toAppError(error));
        throw error;
      }
    },
    failureTitle: sheet.failed,
    fieldLines: { note: { required: sheet.replyRequired } },
    failureLines: { forbidden: copy.desk.refusals.forbidden, not_found: sheet.gone },
  });
  const chosen = useWatch({ control: form.form.control, name: 'status' });
  const busy = form.isPending;

  // A report decided meanwhile, or gone, takes no decision here: the sheet is read-only.
  const settled =
    refusal !== null && (refusal.code === 'REPORT_ALREADY_DECIDED' || refusal.status === 404);
  const open = report.status === 'OPEN' && !settled;
  const decide = (status: DataReportDecision) => () => {
    if (busy || form.blocked) return;
    setRefusal(null);
    form.form.setValue('status', status);
    form.submit();
  };
  // No answer: the first may have landed, and the same decision again changes nothing (S4).
  const failure: FormFailureView | null =
    form.failure?.kind === 'offline'
      ? { ...form.failure, title: sheet.failed, message: sheet.lost }
      : form.failure;
  const day = reportDay(report.createdAt, language, new Date());
  const note = report.decision?.note ?? null;

  return {
    title: sheet.title({ field: fieldLabel(report.field, words.fields) }),
    description: words.byline({ who: words.visitor, day }),
    // Decided elsewhere and not read back yet: «تمت المراجعة», never the stale «جديد».
    status:
      refusal?.code === 'REPORT_ALREADY_DECIDED' && report.status === 'OPEN'
        ? { label: words.chips.decided, tone: 'neutral' as const }
        : statusView(report.status, words.statuses, 'staff'),
    facts: { label: sheet.report, message: messageView(report.message, words) },
    editLink: editLink === null ? null : { label: sheet.editField, to: editLink },
    decided:
      report.decision === null
        ? null
        : {
            label: sheet.decided,
            reply: note === null ? sheet.noReply : sheet.reply({ text: isolate(note) }),
          },
    reply: open
      ? {
          label: sheet.replySpace,
          helper: sheet.replyHelper,
          field: form.field('note'),
          error: form.errors.note,
        }
      : null,
    resolve: open
      ? { label: sheet.resolve, run: decide('RESOLVED'), busy: busy && chosen === 'RESOLVED' }
      : null,
    dismiss: open
      ? { label: sheet.dismiss, run: decide('DISMISSED'), busy: busy && chosen === 'DISMISSED' }
      : null,
    /** A decision is on its way: the sheet holds, and neither button sends another. */
    busy,
    /** Too many attempts: the buttons wait out the count. */
    blocked: form.blocked,
    failure,
    closeLabel: sheet.close,
    /** Closes the sheet, unless a decision is on its way. */
    close: () => {
      if (!busy) onClose();
    },
  };
}

/** The decision sheet, ready to render. */
export type DecideSheetView = ReturnType<typeof useDecideSheet>;
