import { fillReminder } from '@masaha/shared/space-settings';

/**
 * The WhatsApp reminder to a customer who owes (D3.11): the space's template, else the catalogue's,
 * filled with the customer's first name — the first word of the name, as the prototype's (DI28) —,
 * the amount owed and the space's name.
 */
export function reminderText(
  template: string,
  values: { name: string; amount: string; space: string },
): string {
  const first = values.name.trim().split(/\s+/u)[0] ?? values.name;
  return fillReminder(template, { ...values, name: first });
}
