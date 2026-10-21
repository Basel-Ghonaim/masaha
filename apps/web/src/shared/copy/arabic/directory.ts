import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const DIRECTORY = {
  title: 'مساحات العمل',
  search: {
    label: 'ابحث عن مساحة',
    placeholder: 'اسم المساحة أو المنطقة',
    refused: 'اكتب حرفًا من اسم المساحة أو منطقتها',
  },
  sort: {
    label: 'الترتيب',
    value: ({ sort }: { sort: string }) => `الترتيب: ${sort}`,
    options: {
      updated: 'الأحدث تحديثًا',
      name: 'حسب الاسم',
      relevance: 'الأفضل تطابقًا',
    },
  },
  count: {
    all: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا توجد مساحات في قطاع غزة بعد',
        one: 'مساحة واحدة في قطاع غزة',
        two: 'مساحتان في قطاع غزة',
        few: `${String(count)} مساحات في قطاع غزة`,
        many: `${String(count)} مساحة في قطاع غزة`,
        other: `${String(count)} مساحة في قطاع غزة`,
      }),
    matching: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا توجد مساحات مطابقة',
        one: 'مساحة واحدة مطابقة',
        two: 'مساحتان مطابقتان',
        few: `${String(count)} مساحات مطابقة`,
        many: `${String(count)} مساحة مطابقة`,
        other: `${String(count)} مساحة مطابقة`,
      }),
  },
  results: 'النتائج',
  loadFailed: 'تعذّر تحميل المساحات',
  refreshFailed: 'تعذّر تحديث القائمة',
  empty: {
    title: 'لا توجد مساحات في الدليل بعد',
    text: 'نضيف المساحات تباعًا؛ عد قريبًا.',
  },
  noMatch: {
    title: 'لا توجد مساحات تطابق ما اخترت',
    text: 'جرّب إزالة بعض الفلاتر أو البحث باسم آخر.',
  },
  clearFilters: 'مسح الفلاتر',
  pagination: {
    label: 'صفحات المساحات',
    previous: 'السابق',
    next: 'التالي',
    page: ({ page }: { page: number }) => `الصفحة ${String(page)}`,
    summary: ({ page, total }: { page: number; total: number }) =>
      `صفحة ${String(page)} من ${String(total)}`,
    more: 'صفحات أخرى',
  },
  card: {
    verified: 'موثّقة',
    today: ({ range }: { range: string }) => `اليوم ${range}`,
    closedToday: 'مغلقة اليوم',
    openAllDay: 'مفتوحة اليوم على مدار الساعة',
  },
  status: {
    none: 'لا تتوفر حالة مباشرة',
  },
} satisfies Catalogue['directory'];
