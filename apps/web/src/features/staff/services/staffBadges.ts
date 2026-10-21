import type { StaffMember } from '@masaha/shared/space-links';
import type { Catalogue } from '@shared/copy';
import type { BadgeView } from '../types/StaffRowView';

/**
 * A staff member's badges: whether they may reach the space, and, while they may, a temporary
 * password still to be changed, or past its expiry at `now` (an instant, whatever the time zone).
 */
export function badgesOf(
  member: StaffMember,
  now: Date,
  words: Catalogue['staff']['badges'],
): BadgeView[] {
  if (!member.isActive) return [{ label: words.inactive, variant: 'neutral' }];
  const badges: BadgeView[] = [{ label: words.active, variant: 'success' }];
  const pending = member.temporaryPassword;
  if (pending !== null) {
    const expired = Date.parse(pending.expiresAt) <= now.getTime();
    badges.push({ label: expired ? words.expired : words.pending, variant: 'warning' });
  }
  return badges;
}
