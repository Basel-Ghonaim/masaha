import { describe, expect, it } from 'vitest';
import { reminderText } from './reminderText';

describe('reminderText', () => {
  it('fills the reminder with the first name, the amount and the space', () => {
    expect(
      reminderText('مرحبًا {الاسم}، عليك {المبلغ} في {المساحة}.', {
        name: '  Sara Ahmad Odeh ',
        amount: '₪45',
        space: 'Focus Hub',
      }),
    ).toBe('مرحبًا Sara، عليك ₪45 في Focus Hub.');
  });
});
