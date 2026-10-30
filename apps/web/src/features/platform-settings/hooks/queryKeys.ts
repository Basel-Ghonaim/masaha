/** One of the admin's three cards, each its own resource. */
export type AdminSettingsCard = 'contact' | 'staleness' | 'defaults';

/**
 * The capability's keys, each under its audience's scope (docs/frontend/architecture.md §7): the
 * admin's cards under the admin's.
 */
export const platformSettingsKeys = {
  /** One of the admin's cards, as saved. */
  admin: (card: AdminSettingsCard) => ['admin', 'platform-settings', card] as const,
};
