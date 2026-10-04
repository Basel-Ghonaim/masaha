import type { Catalogue } from '../shape';

export const USERS = {
  menu: ({ name }: { name: string }) => `قائمة الحساب: ${name}`,
  section: 'الحساب',
  signOut: 'تسجيل الخروج',
  signOutFailed: 'تعذّر تسجيل الخروج',
} satisfies Catalogue['users'];
