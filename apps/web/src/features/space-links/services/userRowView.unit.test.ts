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
  receptionSpaces: [],
};

const NOW = new Date('2026-10-19T09:00:00Z');
const english = { words: CATALOGUES.en.spaceLinks.usersList.row, english: true, now: NOW };
const arabic = { words: CATALOGUES.ar.spaceLinks.usersList.row, english: false, now: NOW };

describe('userRowView', () => {
  it('words the state: active as success, suspended as neutral', () => {
    expect(userRowView(RIMA, english).state).toEqual({ label: 'Active', variant: 'success' });
    expect(userRowView({ ...RIMA, isSuspended: true }, english).state).toEqual({
      label: 'Suspended',
      variant: 'neutral',
    });
  });

  it.each([
    [
      'a user with a password',
      { role: 'USER', signIn: { password: true, google: false } },
      ['User', 'Password'],
      ['مستخدم', 'كلمة مرور'],
    ],
    [
      'an owner with Google only',
      { role: 'OWNER', signIn: { password: false, google: true } },
      ['Owner', 'Google'],
      ['مالك', 'Google'],
    ],
    [
      'an admin with both',
      { role: 'ADMIN', signIn: { password: true, google: true } },
      ['Admin', 'Password and Google'],
      ['أدمن', 'كلمة مرور وGoogle'],
    ],
  ] as const)(
    'words the role, how the account signs in, and when it joined: %s',
    (_case, facts, [roleEn, signInEn], [roleAr, signInAr]) => {
      const row: AdminUserRow = { ...RIMA, ...facts, signIn: { ...facts.signIn } };

      expect(userRowView(row, english)).toMatchObject({
        role: roleEn,
        signIn: signInEn,
        joined: '1 Sept',
      });
      expect(userRowView(row, arabic)).toMatchObject({ role: roleAr, signIn: signInAr });
    },
  );

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

  it('names each reception desk in the interface’s language, an English-only one marked as English', () => {
    const desks: AdminUserRow = {
      ...RIMA,
      receptionSpaces: [
        { id: 11, nameEn: 'Olive Desk', nameAr: null },
        { id: 12, nameEn: 'Sea View', nameAr: 'إطلالة البحر' },
      ],
    };

    expect(userRowView(desks, english).receptionSpaces).toEqual([
      { text: 'Olive Desk' },
      { text: 'Sea View' },
    ]);
    expect(userRowView(desks, arabic).receptionSpaces).toEqual([
      { text: 'Olive Desk', lang: 'en', dir: 'ltr' },
      { text: 'إطلالة البحر' },
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
