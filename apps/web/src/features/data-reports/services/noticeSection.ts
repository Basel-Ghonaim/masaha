import type { DataReportField } from '@masaha/shared/data-reports';

/** A section of the space profile that a report's notice shows inside. */
export type NoticeSection = 'prices' | 'hours' | 'amenities' | 'about' | 'location' | 'contacts';

/**
 * The section a report's field is edited in, which shows its notice (G3): the place in «الموقع»,
 * «أخرى» in «عن المساحة», each other field its own group's section.
 */
export const NOTICE_SECTIONS: Record<DataReportField, NoticeSection> = {
  LOCATION: 'location',
  OTHER: 'about',
  HOURS: 'hours',
  PRICES: 'prices',
  AMENITIES: 'amenities',
  CONTACT: 'contacts',
};
