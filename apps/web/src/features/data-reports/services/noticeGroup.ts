import type { DataReportField } from '@masaha/shared/data-reports';

/** A section of the space's editor that a report notice can sit above. */
export type NoticeGroup = 'profile' | 'hours' | 'prices' | 'amenities' | 'contacts';

/**
 * The section a report's field is edited in: the place and «أخرى» in the profile's «المساحة», each
 * other field its own group's section.
 */
export const NOTICE_GROUPS: Record<DataReportField, NoticeGroup> = {
  LOCATION: 'profile',
  OTHER: 'profile',
  HOURS: 'hours',
  PRICES: 'prices',
  AMENITIES: 'amenities',
  CONTACT: 'contacts',
};
