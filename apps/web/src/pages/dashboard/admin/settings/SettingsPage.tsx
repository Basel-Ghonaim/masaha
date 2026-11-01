import { PlatformSettingsCards } from '@features/platform-settings';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «إعدادات المنصة» (screen 32, AD-029): `platform-settings`' three cards, each read, saved and
 * refused on its own. The guard has checked the admin's role.
 */
export function SettingsPage() {
  return (
    <>
      <PageHeader />
      <PlatformSettingsCards />
    </>
  );
}
