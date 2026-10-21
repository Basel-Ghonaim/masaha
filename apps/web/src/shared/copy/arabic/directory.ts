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
        zero: `${String(count)} مساحة في قطاع غزة`,
        one: 'مساحة واحدة في قطاع غزة',
        two: 'مساحتان في قطاع غزة',
        few: `${String(count)} مساحات في قطاع غزة`,
        many: `${String(count)} مساحة في قطاع غزة`,
        other: `${String(count)} مساحة في قطاع غزة`,
      }),
    matching: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `${String(count)} مساحة مطابقة`,
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
  filters: {
    title: 'الفلاتر',
    description: 'تُطبَّق فورًا على النتائج',
    applied: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا فلاتر مطبّقة',
        one: 'فلتر واحد مطبّق',
        two: 'فلتران مطبّقان',
        few: `${String(count)} فلاتر مطبّقة`,
        many: `${String(count)} فلترًا مطبّقًا`,
        other: `${String(count)} فلتر مطبّق`,
      }),
    show: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `عرض ${String(count)} مساحة`,
        one: 'عرض المساحة',
        two: 'عرض المساحتين',
        few: `عرض ${String(count)} مساحات`,
        many: `عرض ${String(count)} مساحة`,
        other: `عرض ${String(count)} مساحة`,
      }),
    showNone: 'لا نتائج — غيّر الفلاتر',
    showLoading: 'عرض النتائج',
    clear: 'مسح',
    close: 'إغلاق',
    spaces: 'المساحات',
    availableNow: 'متاحة الآن فقط',
    verified: 'المساحات الموثّقة فقط',
    availableNote: 'تشمل «متاحة الآن» المساحات الموثّقة فقط.',
    price: 'السعر',
    period: 'الفترة',
    from: 'من',
    to: 'إلى',
    currency: '₪',
    periods: { HOUR: 'ساعة', DAY: 'يوم', WEEK: 'أسبوع', MONTH: 'شهر' },
    rangeHelp: ({ period }: { period: string }) => `يُطبَّق «من» و«إلى» على سعر ${period}`,
    periodPrices: { HOUR: 'الساعة', DAY: 'اليوم', WEEK: 'الأسبوع', MONTH: 'الشهر' },
    priceErrors: {
      invalid: 'اكتب مبلغًا بالشيكل أكبر من صفر',
      tooHigh: 'اكتب مبلغًا حتى 100,000 ₪',
      belowMin: 'أقل من الحد الأدنى',
    },
    other: 'أخرى',
    studentPrices: 'أسعار للطلاب',
    openFriday: 'مفتوحة يوم الجمعة',
  },
} satisfies Catalogue['directory'];
