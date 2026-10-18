import type { AdminUserRow } from '@masaha/shared/space-links';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { userRowView } from './userRowView';

const RIMA: AdminUserRow = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  role: 'OWNER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [
    { id: 7, nameEn: 'Focus Hub', nameAr: null },
    { id: 9, nameEn: 'Palm Hub', nameAr: 'بالم' },
  ],
};

const english = { lines: CATALOGUES.en.spaceLinks.ownersList, english: true };
const arabic = { lines: CATALOGUES.ar.spaceLinks.ownersList, english: false };

describe('userRowView', () => {
  it('words the state: active as success, suspended as neutral', () => {
    expect(userRowView(RIMA, english).state).toEqual({ label: 'Active', variant: 'success' });
    expect(userRowView({ ...RIMA, isSuspended: true }, english).state).toEqual({
      label: 'Suspended',
      variant: 'neutral',
    });
  });

  it('names each space in the interface’s language, an English-only one marked as English', () => {
    expect(userRowView(RIMA, english).spaces).toEqual([
      { text: 'Focus Hub' },
      { text: 'Palm Hub' },
    ]);
    expect(userRowView(RIMA, arabic).spaces).toEqual([
      { text: 'Focus Hub', lang: 'en', dir: 'ltr' },
      { text: 'بالم' },
    ]);
  });

  it('marks an owner with no space as one whose spaces are all deleted, and never a user', () => {
    expect(userRowView(RIMA, english).allSpacesDeleted).toBe(false);
    expect(userRowView({ ...RIMA, spaces: [] }, english).allSpacesDeleted).toBe(true);
    expect(userRowView({ ...RIMA, role: 'USER', spaces: [] }, english).allSpacesDeleted).toBe(
      false,
    );
  });
});
