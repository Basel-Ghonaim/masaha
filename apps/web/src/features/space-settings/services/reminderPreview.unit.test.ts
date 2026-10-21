import { describe, expect, it } from 'vitest';
import { reminderPreview } from './reminderPreview';

const SAMPLE = { name: 'رهف', amount: '₪150', space: 'مساحة تجريبية' };

describe('reminderPreview', () => {
  it('fills every placeholder, each time it appears', () => {
    expect(
      reminderPreview('{الاسم}، عليك {المبلغ} في {المساحة}. {الاسم}: {المبلغ} {مجهول}', SAMPLE),
    ).toBe('رهف، عليك ₪150 في مساحة تجريبية. رهف: ₪150 {مجهول}');
  });
});
