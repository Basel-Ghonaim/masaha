import { describe, expect, it } from 'vitest';
import { adminEditorLink, ownerFieldLink } from './fieldSections';

describe('«تعديل الحقل» carries ?report=', () => {
  it('leads the owner to the field’s section, the prices to Packages & prices, «أخرى» to the notice', () => {
    expect(ownerFieldLink(7, 'HOURS', 41)).toBe('/dashboard/spaces/7/profile?report=41#hours');
    expect(ownerFieldLink(7, 'LOCATION', 41)).toBe(
      '/dashboard/spaces/7/profile?report=41#location',
    );
    expect(ownerFieldLink(7, 'PRICES', 41)).toBe('/dashboard/spaces/7/packages?report=41#prices');
    expect(ownerFieldLink(7, 'OTHER', 41)).toBe('/dashboard/spaces/7/profile?report=41#report');
  });

  it('leads the admin to the editor’s section with the report, and a space alone to its editor', () => {
    expect(adminEditorLink(7, 'AMENITIES', 41)).toBe(
      '/dashboard/admin/spaces/7?report=41#amenities',
    );
    expect(adminEditorLink(7, 'OTHER', 41)).toBe('/dashboard/admin/spaces/7?report=41#report');
    expect(adminEditorLink(7)).toBe('/dashboard/admin/spaces/7');
  });
});
