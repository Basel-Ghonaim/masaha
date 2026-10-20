import { REMINDER_PLACEHOLDERS } from '@masaha/shared/space-settings';

/** What each placeholder stands for in the preview: a customer's name, an amount, the space. */
export type ReminderSample = { name: string; amount: string; space: string };

/**
 * The reminder as a customer would receive it: each placeholder, every time it appears, filled with
 * the sample's value — `{الاسم}` the name, `{المبلغ}` the amount, `{المساحة}` the space.
 */
export function reminderPreview(text: string, sample: ReminderSample): string {
  const [name, amount, space] = REMINDER_PLACEHOLDERS;
  return text
    .replaceAll(name, sample.name)
    .replaceAll(amount, sample.amount)
    .replaceAll(space, sample.space);
}
