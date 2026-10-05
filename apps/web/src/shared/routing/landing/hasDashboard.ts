import type { SessionUser } from '@shared/session';

/**
 * Whether the user has a dashboard to land in (docs/frontend/architecture.md › Landing and guards):
 * the admin, and anyone with an active link to a space. Everyone else lands home.
 */
export function hasDashboard(user: SessionUser): boolean {
  return user.role === 'ADMIN' || user.spaces.length > 0;
}
