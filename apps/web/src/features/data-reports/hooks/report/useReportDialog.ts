import {
  createReportSchema,
  DATA_REPORT_FIELDS,
  type CreateReportRequest,
  type DataReportField,
} from '@masaha/shared/data-reports';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import type { SpaceNameView } from '@shared/lib';
import { isolate } from '@shared/localisation';
import type { BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { toastReported } from '../../components/toast/toastReported';
import { useReport } from './useReport';

type Values = { field: DataReportField | ''; message: string };

/**
 * The report's dialog, ready to render: who reads it, by the space's verification (DI-45, U10); the
 * field group, chosen; the details, required for «أخرى» only, said optional otherwise (DI-44). Sent
 * once, with no key (S4); a refusal keeps it open with every value (DI-46): a space gone, a 429
 * counted down, no answer saying a retry is safe. Done, it closes and the toast says where the reply
 * lands, or that one is already open, with «عرض بلاغاتي» (DI-47, DI-48).
 */
export function useReportDialog({
  slug,
  name,
  verified,
  openMyReports,
  onDone,
}: {
  slug: string;
  name: SpaceNameView;
  verified: boolean;
  openMyReports: () => void;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.dataReports.report;
  const reporting = useReport(slug);

  const form = useServerForm<Values, CreateReportRequest>({
    schema: createReportSchema,
    defaultValues: { field: '', message: '' },
    fields: ['field', 'message'],
    // No field chosen is no field, and blank details are none: each `required` as the server says it.
    prepare: (values) => ({
      field: values.field === '' ? undefined : values.field,
      message: values.message.trim() === '' ? undefined : values.message,
    }),
    submit: async (body) => {
      const { repeated } = await reporting.mutateAsync(body);
      toastReported({ repeated, verified, openMine: openMyReports });
      onDone();
    },
    failureTitle: words.failed,
    fieldLines: {
      // None chosen is no choice of the six: the schema says `invalid_choice`.
      field: { required: words.fieldRequired, invalid_choice: words.fieldRequired },
      message: { required: words.messageRequired },
    },
    failureLines: { not_found: words.gone },
  });
  const [field] = useWatch({ control: form.form.control, name: ['field'] });
  // No answer: the report may have landed, and a repeat answers the open one, so a retry is safe.
  const failure =
    form.failure?.kind === 'offline'
      ? { ...form.failure, title: words.failed, message: words.lost }
      : form.failure;

  return {
    title: words.title,
    description: (verified ? words.toSpace : words.toTeam)({ name: isolate(name.text) }),
    field: {
      label: words.field,
      placeholder: words.choose,
      options: DATA_REPORT_FIELDS.map((value) => ({
        value,
        label: copy.dataReports.fields[value],
      })),
      value: field,
      choose: (value: string) => {
        const chosen = DATA_REPORT_FIELDS.find((each) => each === value);
        if (chosen === undefined) return;
        form.form.setValue('field', chosen);
        form.form.clearErrors(['field', 'message']);
      },
      error: form.errors.field,
    },
    message: {
      label: words.message,
      optional: field === 'OTHER' ? null : words.optional,
      helper: words.helper,
      field: form.field('message'),
      error: form.errors.message,
    },
    back: words.back,
    submit: {
      label: words.send,
      run: (event?: BaseSyntheticEvent) => {
        form.submit(event);
      },
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure,
  };
}

/** The report's dialog, ready to render. */
export type ReportDialogView = ReturnType<typeof useReportDialog>;
