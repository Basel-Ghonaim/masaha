import type { Catalogue } from '../shape';

export const SITE = {
  wordmark: 'مساحة',
  navigation: 'التنقّل الرئيسي',
  links: {
    home: 'الرئيسية',
    spaces: 'المساحات',
    about: 'عن مساحة',
  },
  signIn: 'تسجيل الدخول',
  menu: 'القائمة',
  closeMenu: 'إغلاق القائمة',
  tagline: 'مساحة — دليل مساحات العمل المشتركة في قطاع غزة',
  contact: 'تواصل معنا',
  browseSpaces: 'تصفّح المساحات',
} satisfies Catalogue['site'];
