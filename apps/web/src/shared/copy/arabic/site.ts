import { arabicPlural } from '../plural';
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
  home: {
    title: 'اعثر على مساحة عمل في قطاع غزة',
    lead: 'ساعات العمل والأسعار والحالة المباشرة لمساحات العمل المشتركة، في مكان واحد.',
    search: {
      label: 'ابحث عن مساحة',
      placeholder: 'اسم المساحة أو المنطقة',
      submit: 'بحث',
    },
    areas: {
      title: 'تصفّح حسب المنطقة',
      all: 'كل المناطق',
      strip: 'قطاع غزة',
      count: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: `${String(count)} مساحة`,
          one: 'مساحة واحدة',
          two: 'مساحتان',
          few: `${String(count)} مساحات`,
          many: `${String(count)} مساحة`,
          other: `${String(count)} مساحة`,
        }),
      line: ({ place, count }: { place: string; count: string }) => `${place} · ${count}`,
      failed: 'تعذّر تحميل المناطق',
    },
    owners: {
      title: 'هل تدير مساحة عمل؟',
      text: 'تواصل معنا لإضافة مساحتك، وإدارة ساعاتها وأسعارها، وإظهار حالتها المباشرة.',
      action: 'تواصل معنا',
    },
  },
} satisfies Catalogue['site'];
