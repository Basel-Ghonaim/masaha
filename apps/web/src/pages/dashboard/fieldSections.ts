import type { DataReportField } from '@masaha/shared/data-reports';
import { adminSpacePath, spacePagePath } from './navigation';

/**
 * The space editor's section where each field group of a data report is edited — its cards'
 * anchors — for «تعديل الحقل» (DI-33); «أخرى» has none, and lands on the report's notice
 * (`#report`) above the profile.
 */
export const FIELD_SECTIONS: Record<DataReportField, string | null> = {
  PRICES: 'prices',
  HOURS: 'hours',
  CONTACT: 'contacts',
  LOCATION: 'location',
  AMENITIES: 'amenities',
  OTHER: null,
};

/** The hash a report's link lands on: its field's section, or the report's notice for «أخرى». */
const landingOf = (field: DataReportField) => `#${FIELD_SECTIONS[field] ?? 'report'}`;

/**
 * The owner's «تعديل الحقل»: where the report's field is edited — the prices on Packages & prices,
 * the other groups in the space profile — carrying the report, so its notice shows there (D6.8).
 */
export function ownerFieldLink(spaceId: number, field: DataReportField, reportId: number): string {
  const page = spacePagePath(spaceId, field === 'PRICES' ? 'packages' : 'profile');
  return `${page}?report=${String(reportId)}${landingOf(field)}`;
}

/**
 * The admin's link to a space's editor; with a report, its «تعديل الحقل», landing on its field's
 * section and carrying the report (D6.8).
 */
export function adminEditorLink(
  spaceId: number,
  field?: DataReportField,
  reportId?: number,
): string {
  const editor = adminSpacePath(spaceId);
  if (field === undefined || reportId === undefined) return editor;
  return `${editor}?report=${String(reportId)}${landingOf(field)}`;
}
