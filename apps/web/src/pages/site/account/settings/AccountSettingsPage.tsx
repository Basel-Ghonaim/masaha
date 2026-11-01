import { SetPasswordByEmail } from '@features/auth';
import { MyAccountSettings } from '@features/users';
import { useCopy } from '@shared/copy';

// A Google-only account's link to set a first password: `auth`'s, the forgotten password's link
// sent with its resend and its wait (D9.2). Made once, so it is the same between renders.
const setPassword = (email: string) => <SetPasswordByEmail email={email} />;

/**
 * «إعدادات حسابي» (screen 9, D9.2), in the account's layout, signed-in only: its heading, then the
 * account's three cards in one column — the profile, the preferences and the ways of signing in, the
 * link to set a first password `auth`'s.
 */
export function AccountSettingsPage() {
  const copy = useCopy();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-heading-1">{copy.users.settings.title}</h1>
      <MyAccountSettings setPassword={setPassword} />
    </div>
  );
}
