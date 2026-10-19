import { paragraphSchema } from '../core/index.ts';

// The WhatsApp debt reminder a space's owner writes (docs/api/api-contract.md §5, Settings
// (managed)). Its own file: the web's form and the finance step, which fills it, use the same rule.

/** The placeholders a reminder may hold, as the owner types them, in either interface language. */
export const REMINDER_PLACEHOLDERS = ['{الاسم}', '{المبلغ}', '{المساحة}'] as const;

/** The one a reminder must hold: the customer is told what they owe. */
export const REMINDER_AMOUNT = '{المبلغ}';

export const REMINDER_TEMPLATE_MAX_LENGTH = 500;

// A pair of braces with no brace inside: a lone brace is text.
const PLACEHOLDER = /\{[^{}]*\}/gu;

/** Every `{…}` the text holds, in order: a pair of braces with no brace inside. */
export function placeholdersIn(text: string): string[] {
  return text.match(PLACEHOLDER) ?? [];
}

function isPlaceholder(token: string): boolean {
  return (REMINDER_PLACEHOLDERS as readonly string[]).includes(token);
}

/**
 * A reminder: a paragraph, each placeholder from the list (any number of times), the amount among
 * them. A placeholder off the list (a typo, another language's) is refused, so a customer never
 * receives a literal `{…}`; the two refusals differ, so a form can say which. An empty reminder is
 * only too short: the amount's rule waits for a text.
 */
export const reminderTemplateSchema = paragraphSchema(1, REMINDER_TEMPLATE_MAX_LENGTH)
  .refine((text) => placeholdersIn(text).every(isPlaceholder), {
    params: { code: 'invalid_choice' },
  })
  .refine((text) => text === '' || placeholdersIn(text).includes(REMINDER_AMOUNT), {
    params: { code: 'invalid_format' },
  });
