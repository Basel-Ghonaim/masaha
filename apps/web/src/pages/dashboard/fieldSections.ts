import type { DataReportField } from '@masaha/shared/data-reports';
import { adminSpacePath, spacePagePath } from './navigation';

/**
 * Where a report's link lands: its notice (`#report`), drawn above the section its field is edited
 * in — «أخرى» above the profile —, so the notice and «تم التصحيح» are in sight with the field below.
 */
const LANDING = '#report';

/**
 * The owner's «تعديل الحقل»: where the report's field is edited — the prices on Packages & prices,
 * the other groups in the space profile — carrying the report, so its notice shows there and the
 * page lands on it (D6.8).
 */
export function ownerFieldLink(spaceId: number, field: DataReportField, reportId: number): string {
  const page = spacePagePath(spaceId, field === 'PRICES' ? 'packages' : 'profile');
  return `${page}?report=${String(reportId)}${LANDING}`;
}

/**
 * The admin's link to a space's editor; with a report, its «تعديل الحقل», carrying the report and
 * landing on its notice above the field's section (D6.8).
 */
export function adminEditorLink(
  spaceId: number,
  field?: DataReportField,
  reportId?: number,
): string {
  const editor = adminSpacePath(spaceId);
  if (field === undefined || reportId === undefined) return editor;
  return `${editor}?report=${String(reportId)}${LANDING}`;
}
