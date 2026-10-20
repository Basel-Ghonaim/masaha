import type { StaffMember } from '@masaha/shared/space-links';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { badgesOf } from './staffBadges';

const WORDS = CATALOGUES.ar.staff.badges;
const NOW = new Date('2026-10-20T10:00:00Z');

const member = (fields: Partial<StaffMember>): StaffMember => ({
  userId: 15,
  name: 'رهف',
  email: 'rahaf@example.com',
  isActive: true,
  temporaryPassword: null,
  ...fields,
});

const labels = (fields: Partial<StaffMember>) =>
  badgesOf(member(fields), NOW, WORDS).map(({ label, variant }) => `${variant}:${label}`);

describe('badgesOf', () => {
  it('marks an active member’s pending password, or its expiry, and none for a deactivated one', () => {
    expect(labels({})).toEqual(['success:نشط']);
    expect(labels({ temporaryPassword: { expiresAt: '2026-10-21T10:00:00Z' } })).toEqual([
      'success:نشط',
      'warning:لم يغيّر كلمة المرور المؤقتة بعد',
    ]);
    expect(labels({ temporaryPassword: { expiresAt: '2026-10-20T09:59:59Z' } })).toEqual([
      'success:نشط',
      'warning:انتهت صلاحية كلمة المرور المؤقتة',
    ]);
    expect(
      labels({ isActive: false, temporaryPassword: { expiresAt: '2026-10-21T10:00:00Z' } }),
    ).toEqual(['neutral:بلا وصول']);
  });
});
