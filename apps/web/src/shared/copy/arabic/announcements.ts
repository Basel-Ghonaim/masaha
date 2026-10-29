import { arabicPlural } from '../plural';
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
    extendedLock: 'مُدّدت اشتراكاته، فلا يُحذف ولا تُؤخَّر نهايته.',
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
    end: 'إنهاء الآن',
    start: 'ابدأ الآن',
    more: ({ type, period }: { type: string; period: string }) =>
      `إجراءات أخرى: ${type} · ${period}`,
    delete: 'حذف…',
    ended: 'انتهى الإعلان',
    closureEnded: 'انتهى الإغلاق · عادت الحالة تلقائية',
    started: 'بدأ الإعلان الآن',
    undo: 'تراجع',
    undone: 'أُعيد الإعلان كما كان',
    undoFailed: 'تعذّر التراجع',
    failed: 'تعذّر تنفيذ الإجراء',
    startTooLong: 'نهايته بعد أكثر من 365 يومًا من الآن؛ عدّلها أولًا.',
  },
  delete: {
    title: ({ type, period }: { type: string; period: string }) =>
      `حذف إعلان «${type} · ${period}»؟`,
    runningClosure: 'يختفي من صفحة المساحة، وتعود حالتها تلقائية فورًا. لا يمكن استرجاعه.',
    running: 'يختفي من صفحة المساحة فورًا. لا يمكن استرجاعه.',
    upcoming: 'لن يظهر للزوار. لا يمكن استرجاعه.',
    ended: 'يُحذف من القائمة. لا يمكن استرجاعه.',
    confirm: 'حذف',
    back: 'رجوع',
    done: 'حُذف الإعلان',
    failed: 'تعذّر حذف الإعلان',
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
  extension: {
    action: 'تمديد الاشتراكات',
    title: 'تمديد الاشتراكات التي شملها الإغلاق؟',
    covered: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا يشمل التمديد أي اشتراك.',
        one: 'يشمل التمديد اشتراكًا واحدًا.',
        two: 'يشمل التمديد اشتراكين.',
        few: `يشمل التمديد ${String(count)} اشتراكات.`,
        many: `يشمل التمديد ${String(count)} اشتراكًا.`,
        other: `يشمل التمديد ${String(count)} اشتراك.`,
      }),
    text: 'هي التي شملها الإغلاق، وتجديداتها التي لم تبدأ بعد؛ يتأخر كلٌّ منها بعدد الأيام أدناه. لا يمكن التراجع، ولا التمديد مرة ثانية لهذا الإغلاق.',
    days: 'عدد الأيام',
    daysHelper: ({ days, first, last }: { days: string; first: string; last: string }) =>
      `أيام الإغلاق: ${days} (${first} – ${last})`,
    daysRange: 'بين 1 و365 يومًا',
    submit: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `مدّد ${String(count)} اشتراك`,
        one: 'مدّد اشتراكًا واحدًا',
        two: 'مدّد اشتراكين',
        few: `مدّد ${String(count)} اشتراكات`,
        many: `مدّد ${String(count)} اشتراكًا`,
        other: `مدّد ${String(count)} اشتراك`,
      }),
    count: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا اشتراكات',
        one: 'اشتراك واحد',
        two: 'اشتراكان',
        few: `${String(count)} اشتراكات`,
        many: `${String(count)} اشتراكًا`,
        other: `${String(count)} اشتراك`,
      }),
    dayCount: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا أيام',
        one: 'يوم واحد',
        two: 'يومان',
        few: `${String(count)} أيام`,
        many: `${String(count)} يومًا`,
        other: `${String(count)} يوم`,
      }),
    line: ({
      count,
      days,
      name,
      date,
    }: {
      count: string;
      days: string;
      name: string;
      date: string;
    }) => `مُدّد ${count} · ${days} · ${name} · ${date}`,
    none: 'لم يشمل هذا الإغلاق أي اشتراك، فلا شيء يُمدَّد.',
    applied: ({ count, days }: { count: string; days: string }) =>
      `مُدّدت اشتراكات هذا الإغلاق من قبل: ${count} · ${days}.`,
    done: 'مُدّدت الاشتراكات',
    doneText: ({ count, days }: { count: string; days: string }) => `${count} · ${days}`,
    failed: 'تعذّر التمديد',
    loadFailed: 'تعذّر حساب الاشتراكات المشمولة',
    lost: 'لم يصل الرد. أعد المحاولة — لن تُمدَّد مرتين.',
    back: 'رجوع',
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
