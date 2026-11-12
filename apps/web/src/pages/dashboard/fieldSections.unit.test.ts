import { describe, expect, it } from 'vitest';
import { adminEditorLink, ownerFieldLink, ownerGroupLink, ownerPricesLink } from './fieldSections';

describe('«تعديل الحقل» carries ?report=', () => {
  it('leads the owner to the report’s notice in the space profile, the prices included (R1)', () => {
    expect(ownerFieldLink(7, 41)).toBe('/dashboard/spaces/7/profile?report=41#report');
  });

  it('leads the admin to the editor’s notice of the report, and a space alone to its editor', () => {
    expect(adminEditorLink(7, 'AMENITIES', 41)).toBe('/dashboard/admin/spaces/7?report=41#report');
    expect(adminEditorLink(7, 'OTHER', 41)).toBe('/dashboard/admin/spaces/7?report=41#report');
    expect(adminEditorLink(7)).toBe('/dashboard/admin/spaces/7');
  });
});

describe('the owner’s ways to a fact', () => {
  it('leads the overview to each group’s section of the profile, the profile’s own to «عن المساحة»', () => {
    expect(ownerGroupLink(7, 'prices')).toBe('/dashboard/spaces/7/profile#prices');
    expect(ownerGroupLink(7, 'profile')).toBe('/dashboard/spaces/7/profile#about');
    expect(ownerGroupLink(7, 'hours')).toBe('/dashboard/spaces/7/profile#hours');
    expect(ownerGroupLink(7, 'contacts')).toBe('/dashboard/spaces/7/profile#contacts');
  });

  it('opens the profile’s prices Sheet to edit the prices', () => {
    expect(ownerPricesLink(7)).toBe('/dashboard/spaces/7/profile?sheet=prices#prices');
  });
});
