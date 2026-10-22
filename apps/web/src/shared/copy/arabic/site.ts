import type { Catalogue } from '../shape';

export const SITE = {
  wordmark: 'مساحة',
  documentTitle: ({ page }: { page: string }) => `${page} · مساحة`,
  skipToContent: 'تخطَّ إلى المحتوى',
  navigation: 'التنقّل الرئيسي',
  links: {
    home: 'الرئيسية',
    spaces: 'المساحات',
    about: 'عن مساحة',
    space: 'صفحة المساحة',
  },
  signIn: 'تسجيل الدخول',
  menu: 'القائمة',
  closeMenu: 'إغلاق القائمة',
  tagline: 'مساحة — دليل مساحات العمل المشتركة في قطاع غزة',
  contact: 'تواصل معنا',
  browseSpaces: 'تصفّح المساحات',
} satisfies Catalogue['site'];
