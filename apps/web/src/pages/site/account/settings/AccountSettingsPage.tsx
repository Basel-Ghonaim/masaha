import { MyAccountSettings } from '@features/users';
import { useCopy } from '@shared/copy';

/**
 * «إعدادات حسابي» (screen 9, D9.2), in the account's layout, signed-in only: its heading, then the
 * account's three cards in one column — the profile, the preferences and the ways of signing in.
 */
export function AccountSettingsPage() {
  const copy = useCopy();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-heading-1">{copy.users.settings.title}</h1>
      <MyAccountSettings />
    </div>
  );
}
