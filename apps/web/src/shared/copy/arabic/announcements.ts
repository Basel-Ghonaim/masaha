import type { Catalogue } from '../shape';

export const ANNOUNCEMENTS = {
  tabs: {
    label: 'حالة الإعلانات',
    RUNNING: 'نشطة',
    UPCOMING: 'مجدولة',
    ENDED: 'منتهية',
  },
  types: {
    GENERAL: 'عام',
    OUTAGE: 'انقطاع كهرباء أو إنترنت',
    CLOSURE: 'إغلاق مؤقت',
    OFFER: 'عرض',
    EVENT: 'فعالية',
  },
  hints: {
    GENERAL: 'خبر أو تنبيه للزوار',
    OUTAGE: 'يبقى المكان مفتوحًا، ويُنبَّه الزوار',
    CLOSURE: 'تظهر المساحة «مغلق الآن» طوال الفترة',
    OFFER: 'سعر أو خدمة لفترة محدودة',
    EVENT: 'ورشة أو لقاء في المساحة',
  },
  period: {
    sameDay: ({ day, from, to }: { day: string; from: string; to: string }) =>
      `${day} ${from}–${to}`,
    range: ({
      fromDay,
      from,
      toDay,
      to,
    }: {
      fromDay: string;
      from: string;
      toDay: string;
      to: string;
    }) => `${fromDay} ${from} – ${toDay} ${to}`,
    open: ({ day, from }: { day: string; from: string }) => `من ${day} ${from} · بلا نهاية`,
  },
  closure: {
    upcoming: 'يمكن تمديد الاشتراكات بعد أن يبدأ الإغلاق.',
    reception: 'يمدّد المالك الاشتراكات بعد بدء الإغلاق.',
  },
  empty: {
    RUNNING: 'لا توجد إعلانات نشطة',
    UPCOMING: 'لا توجد إعلانات مجدولة',
    ENDED: 'لا توجد إعلانات منتهية',
    text: 'أعلن عن إغلاق، أو انقطاع، أو عرض، أو فعالية ليراه الزوار في صفحة المساحة.',
  },
  list: {
    label: 'الإعلانات',
    loadFailed: 'تعذّر تحميل الإعلانات',
    pagination: {
      label: 'صفحات الإعلانات',
      previous: 'السابق',
      next: 'التالي',
      page: ({ page }: { page: number }) => `الصفحة ${String(page)}`,
      summary: ({ page, total }: { page: number; total: number }) =>
        `صفحة ${String(page)} من ${String(total)}`,
      more: 'صفحات أخرى',
    },
  },
} satisfies Catalogue['announcements'];
