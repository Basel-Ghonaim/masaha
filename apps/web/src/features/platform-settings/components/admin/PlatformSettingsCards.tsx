import { useAdminSettingsCards } from '../../hooks/admin/useAdminSettingsCards';
import { ContactCard } from './ContactCard';
import { DefaultsCard } from './DefaultsCard';
import { SettingsCardShell } from './SettingsCardShell';
import { StalenessCard } from './StalenessCard';

/**
 * «إعدادات المنصة» (screen 32, AD-029): one column at a form's reading width, the three cards in
 * order — the contact, the data's freshness, the new spaces' defaults —, each read, saved and
 * refused on its own.
 */
export function PlatformSettingsCards() {
  const { contact, staleness, defaults } = useAdminSettingsCards();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {contact.saved === undefined ? (
        <SettingsCardShell load={contact.load} />
      ) : (
        <ContactCard saved={contact.saved} />
      )}
      {staleness.saved === undefined ? (
        <SettingsCardShell load={staleness.load} />
      ) : (
        <StalenessCard saved={staleness.saved} />
      )}
      {defaults.saved === undefined ? (
        <SettingsCardShell load={defaults.load} />
      ) : (
        <DefaultsCard saved={defaults.saved} />
      )}
    </div>
  );
}
