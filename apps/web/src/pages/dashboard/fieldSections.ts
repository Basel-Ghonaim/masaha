import type { DataReportField } from '@masaha/shared/data-reports';

/**
 * The space editor's section where each field group of a data report is edited — its cards'
 * anchors — for «تعديل الحقل» (DI-33); «أخرى» has none, and leads to the editor itself.
 */
export const FIELD_SECTIONS: Record<DataReportField, string | null> = {
  PRICES: 'prices',
  HOURS: 'hours',
  CONTACT: 'contacts',
  LOCATION: 'location',
  AMENITIES: 'amenities',
  OTHER: null,
};
