import type { DataReportField } from '@masaha/shared/data-reports';
import type { FactGroup } from '@masaha/shared/spaces';
import { adminSpacePath, spacePagePath } from './navigation';

/**
 * Where a report's link lands: its notice (`#report`), drawn inside the section its field is edited
 * in, so the notice and «تم التصحيح» are in sight with the section's facts.
 */
const LANDING = '#report';

/**
 * The owner's «تعديل الحقل»: where the report's field is edited — every field in the space profile,
 * the prices included (R1) — carrying the report, so its notice shows there and the page lands on it
 * (D6.8).
 */
export function ownerFieldLink(spaceId: number, reportId: number): string {
  return `${spacePagePath(spaceId, 'profile')}?report=${String(reportId)}${LANDING}`;
}

/**
 * Where the owner's overview leads for a fact group: its section of the space profile, the profile's
 * own group to «عن المساحة», the prices to «الأسعار المعلنة» (R1).
 */
export function ownerGroupLink(spaceId: number, group: FactGroup): string {
  return `${spacePagePath(spaceId, 'profile')}#${group === 'profile' ? 'about' : group}`;
}

/** Where the owner edits the published prices: the space profile's prices Sheet, opened (R1). */
export function ownerPricesLink(spaceId: number): string {
  return `${spacePagePath(spaceId, 'profile')}?sheet=prices#prices`;
}

/**
 * The admin's link to a space's editor; with a report, its «تعديل الحقل», carrying the report and
 * landing on its notice inside the field's section (D6.8).
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
