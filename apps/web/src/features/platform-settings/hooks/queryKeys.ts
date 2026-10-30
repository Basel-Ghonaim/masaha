/** One of the admin's three cards, each its own resource. */
export type AdminSettingsCard = 'contact' | 'staleness' | 'defaults';

/**
 * The capability's keys, each under its audience's scope (docs/frontend/architecture.md §7): the
 * admin's cards under the admin's, the contact anyone reads under the public scope.
 */
export const platformSettingsKeys = {
  /** The platform's contact, as anyone reads it: the admin's save of the contact reads it again. */
  publicContact: ['public', 'platform-settings', 'contact'] as const,
  /** One of the admin's cards, as saved. */
  admin: (card: AdminSettingsCard) => ['admin', 'platform-settings', card] as const,
};
