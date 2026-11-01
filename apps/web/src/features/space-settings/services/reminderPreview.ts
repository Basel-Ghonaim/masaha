import { fillReminder, type ReminderValues } from '@masaha/shared/space-settings';

/** What each placeholder stands for in the preview: a customer's name, an amount, the space. */
export type ReminderSample = ReminderValues;

/**
 * The reminder as a customer would receive it, filled with the sample by the one filler finance and
 * the customer's file use too: `{الاسم}` the name, `{المبلغ}` the amount, `{المساحة}` the space.
 */
export function reminderPreview(text: string, sample: ReminderSample): string {
  return fillReminder(text, sample);
}
