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
  actions: {
    new: 'إعلان جديد',
    edit: 'تعديل',
  },
  sheet: {
    new: 'إعلان جديد',
    edit: 'تعديل الإعلان',
    description: 'يظهر في صفحة المساحة العامة خلال الفترة.',
    close: 'إغلاق',
    type: 'النوع',
    textAr: 'نص الإعلان بالعربية',
    textArHelper: 'جملة أو جملتان يقرؤها الزائر في صفحة المساحة.',
    textEn: 'نص الإعلان بالإنجليزية',
    textEnHelper: 'يظهر في الواجهة الإنجليزية؛ بدونه يظهر النص العربي.',
    optional: 'اختياري',
    starts: 'يبدأ',
    ends: 'ينتهي',
    now: 'الآن',
    at: 'في موعد',
    noEnd: 'بلا موعد',
    noEndHelp: 'يبقى حتى تنهيه.',
    date: 'التاريخ',
    time: 'الساعة',
    chooseDate: 'اختر التاريخ',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    closure:
      'تظهر المساحة «مغلق الآن» للزوار طوال هذه الفترة، ويُنبَّه الاستقبال عند تسجيل الحضور.',
    preview: 'معاينة — صفحة المساحة العامة',
    publish: 'نشر الإعلان',
    save: 'حفظ',
    failed: 'تعذّر حفظ الإعلان',
    nothingChanged: 'لم يتغيّر شيء',
    lost: 'لم يصل الرد. أعد المحاولة — لن يُنشر مرتين.',
    fields: {
      textArRequired: 'أدخل نص الإعلان بالعربية',
      startRange: 'البداية بين 30 يومًا مضت و365 يومًا قادمة.',
      endRange: 'النهاية بعد الآن، وبعد البداية، وخلال 365 يومًا منها.',
    },
    gone: 'لم يعد هذا الإعلان موجودًا.',
  },
  toast: {
    published: 'نُشر الإعلان',
    saved: 'حُفظ الإعلان',
    inTab: ({ tab }: { tab: string }) => `في «${tab}»`,
    show: 'عرض',
  },
  public: {
    title: 'الإعلانات',
    notice: ({ period }: { period: string }) => `إعلان من إدارة المساحة · ${period}`,
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
