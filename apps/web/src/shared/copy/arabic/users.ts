import type { Catalogue } from '../shape';

export const USERS = {
  menu: ({ name }: { name: string }) => `قائمة الحساب: ${name}`,
  section: 'الحساب',
  dashboard: 'لوحة التحكم',
  signOut: 'تسجيل الخروج',
  signOutFailed: 'تعذّر تسجيل الخروج',
  passwordChange: {
    title: 'اختر كلمة مرور جديدة',
    description: 'هذه كلمة مرور مؤقتة من فريق مساحة، اختر كلمة مرور خاصة بك للمتابعة.',
    newPassword: 'كلمة المرور الجديدة',
    submit: 'حفظ والمتابعة',
    failed: 'تعذّر حفظ كلمة المرور',
    saved: 'حُفظت كلمة المرور الجديدة',
  },
} satisfies Catalogue['users'];
