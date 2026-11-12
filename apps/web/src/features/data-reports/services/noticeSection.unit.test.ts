import { describe, expect, it } from 'vitest';
import { NOTICE_SECTIONS } from './noticeSection';

describe('NOTICE_SECTIONS', () => {
  it('shows a report on the place inside «الموقع» and «أخرى» inside «عن المساحة»', () => {
    expect(NOTICE_SECTIONS.LOCATION).toBe('location');
    expect(NOTICE_SECTIONS.OTHER).toBe('about');
  });

  it('shows each other field’s report inside its own group’s section', () => {
    expect([
      NOTICE_SECTIONS.HOURS,
      NOTICE_SECTIONS.PRICES,
      NOTICE_SECTIONS.AMENITIES,
      NOTICE_SECTIONS.CONTACT,
    ]).toEqual(['hours', 'prices', 'amenities', 'contacts']);
  });
});
