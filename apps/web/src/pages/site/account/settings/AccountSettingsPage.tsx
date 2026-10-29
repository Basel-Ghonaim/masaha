import { useCopy } from '@shared/copy';

/**
 * «إعدادات حسابي» (screen 9): its route and title are the foundation's; its screen is U9's (D9.2),
 * which replaces this body. Until then, the page's heading and nothing more.
 */
export function AccountSettingsPage() {
  const copy = useCopy();

  return <h1 className="text-heading-1">{copy.users.settings.title}</h1>;
}
