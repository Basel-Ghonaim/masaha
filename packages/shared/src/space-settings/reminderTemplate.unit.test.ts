import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { fillReminder, placeholdersIn, reminderTemplateSchema } from './reminderTemplate.ts';
import { updateSpaceSettingsSchema } from './requests.ts';

/** The design's default reminder. */
const DEFAULT = 'مرحبًا {الاسم}، تذكير من {المساحة}: عليك {المبلغ}. يمكنك الدفع في المساحة. شكرًا.';

/** The field errors a settings patch with this reminder fails with, or null when it passes. */
function errorsOf(reminderTemplate: string | null) {
  const body = { reminderTemplate };
  const result = updateSpaceSettingsSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('reminderTemplateSchema', () => {
  it('takes a reminder with the amount, each placeholder any number of times, a lone brace and line breaks kept', () => {
    expect(reminderTemplateSchema.parse(DEFAULT)).toBe(DEFAULT);
    expect(errorsOf('عليك {المبلغ}، أكرر: {المبلغ}')).toBeNull();
    expect(errorsOf('{ {المبلغ}')).toBeNull();
    expect(reminderTemplateSchema.parse('a\r\nb {المبلغ}')).toBe('a\nb {المبلغ}');
    expect(placeholdersIn('يا {الاسم} من {المساحة}، عليك {المبلغ}')).toEqual([
      '{الاسم}',
      '{المساحة}',
      '{المبلغ}',
    ]);
  });

  it('refuses a reminder without the amount, with a placeholder off the list, empty or over 500 characters', () => {
    expect(errorsOf('مرحبًا {الاسم}')).toEqual({ reminderTemplate: ['invalid_format'] });
    expect(errorsOf('{الأسم} {المبلغ}')).toEqual({ reminderTemplate: ['invalid_choice'] });
    expect(errorsOf('{name} {المبلغ}')).toEqual({ reminderTemplate: ['invalid_choice'] });
    expect(errorsOf('')).toEqual({ reminderTemplate: ['too_short'] });
    expect(errorsOf(`{المبلغ}${'a'.repeat(493)}`)).toEqual({ reminderTemplate: ['too_long'] });
    expect(errorsOf(`{المبلغ}${'a'.repeat(492)}`)).toBeNull();
    expect(errorsOf(null)).toBeNull();
  });
});

describe('fillReminder', () => {
  it('fills every placeholder, each time it appears, and leaves the rest of the text as it is', () => {
    expect(
      fillReminder('{الاسم}، عليك {المبلغ} في {المساحة}. {الاسم}: {المبلغ} { {مجهول}', {
        name: 'رهف',
        amount: '45 ₪',
        space: 'مساحة التركيز',
      }),
    ).toBe('رهف، عليك 45 ₪ في مساحة التركيز. رهف: 45 ₪ { {مجهول}');
  });

  it('puts a value in as it is, even one that looks like a placeholder', () => {
    expect(fillReminder('{الاسم} {المبلغ}', { name: '{المبلغ}', amount: '$1', space: '' })).toBe(
      '{المبلغ} $1',
    );
  });
});
