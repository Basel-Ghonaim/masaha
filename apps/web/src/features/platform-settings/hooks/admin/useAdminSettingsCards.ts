import { useCopy } from '@shared/copy';
import { createPlatformSettingsRepository } from '../../repository/platformSettingsRepository';
import { useAdminSettingsQuery } from './useAdminSettingsQuery';

const repository = createPlatformSettingsRepository();

/**
 * The admin's three cards, each read by its own `GET` (AD-029), in the page's order: the contact,
 * the data's freshness, the new spaces' defaults.
 */
export function useAdminSettingsCards() {
  const words = useCopy().platformSettings.admin;
  return {
    contact: useAdminSettingsQuery({
      card: 'contact',
      title: words.contact.title,
      description: words.contact.description,
      read: () => repository.contact(),
    }),
    staleness: useAdminSettingsQuery({
      card: 'staleness',
      title: words.staleness.title,
      description: words.staleness.description,
      read: () => repository.staleness(),
    }),
    defaults: useAdminSettingsQuery({
      card: 'defaults',
      title: words.defaults.title,
      description: words.defaults.description,
      read: () => repository.defaults(),
    }),
  };
}
