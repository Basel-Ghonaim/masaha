import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const LOOKUPS = {
  hint: 'مخفية: لا تظهر في الفلاتر والنماذج. المساحات المرتبطة بها تبقى كما هي. الترتيب هنا هو ترتيب الظهور.',
  governorates: {
    title: 'المحافظات والمناطق',
    add: 'إضافة محافظة',
    areaCount: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا مناطق',
        one: 'منطقة واحدة',
        two: 'منطقتان',
        few: `${String(count)} مناطق`,
        many: `${String(count)} منطقة`,
        other: `${String(count)} منطقة`,
      }),
    empty: 'لا محافظات بعد',
    emptyHint: 'أضف أول محافظة، ثم مناطقها.',
    loadFailed: 'تعذّر تحميل المحافظات',
  },
  areas: {
    add: 'إضافة منطقة',
  },
  amenities: {
    title: 'المرافق',
    add: 'إضافة مرفق',
    empty: 'لا مرافق بعد',
    emptyHint: 'أضف أول مرفق.',
    loadFailed: 'تعذّر تحميل المرافق',
    row: {
      inactive: 'غير نشط',
      active: 'نشط',
      activeName: ({ name }: { name: string }) => `نشط: ${name}`,
    },
  },
  row: {
    hidden: 'مخفية',
    shown: ({ name }: { name: string }) => `ظاهرة: ${name}`,
    moveUp: ({ name }: { name: string }) => `تحريك لأعلى: ${name}`,
    moveDown: ({ name }: { name: string }) => `تحريك لأسفل: ${name}`,
    edit: 'تعديل',
    editName: ({ name }: { name: string }) => `تعديل: ${name}`,
  },
  failure: {
    title: 'لم يُحفظ التغيير',
    orderChanged: 'تغيّر الترتيب في الأثناء، وعُرض الترتيب الجديد. حاول مرة أخرى.',
  },
  sheet: {
    addGovernorate: 'إضافة محافظة',
    editGovernorate: 'تعديل محافظة',
    addArea: 'إضافة منطقة',
    editArea: 'تعديل منطقة',
    addAmenity: 'إضافة مرفق',
    editAmenity: 'تعديل مرفق',
    icon: 'الأيقونة',
    amenityActive: 'نشط',
    amenityActiveHint: 'غير نشط: لا يظهر في النماذج، وتحتفظ به المساحات التي لديها.',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    active: 'نشطة',
    activeHint: 'مخفية: لا تظهر في الفلاتر والنماذج.',
    save: 'حفظ',
    close: 'إغلاق',
    saveFailed: 'تعذّر الحفظ',
    fieldErrors: {
      nameAr: { too_short: 'أدخل الاسم بالعربية' },
      nameEn: {
        too_short: 'أدخل الاسم بالإنجليزية',
        invalid_format: 'استخدم حروفًا لاتينية أو أرقامًا في الاسم الإنجليزي',
      },
      icon: { invalid_choice: 'اختر أيقونة' },
      governorateTaken: 'توجد محافظة أخرى بهذا الاسم العربي',
      areaTaken: 'توجد منطقة أخرى في هذه المحافظة بهذا الاسم العربي',
      amenityTaken: 'يوجد مرفق آخر بهذا الاسم الإنجليزي',
    },
  },
  icons: {
    wifi: 'واي فاي',
    zap: 'برق',
    sun: 'شمس',
    'plug-zap': 'قابس كهرباء',
    coffee: 'فنجان قهوة',
    users: 'أشخاص',
    presentation: 'لوح عرض',
    'graduation-cap': 'قبعة تخرّج',
  },
  placeSelect: {
    all: 'كل المناطق',
    hidden: ({ name }: { name: string }) => `${name} (مخفية)`,
    loadFailed: 'تعذّر تحميل المناطق',
  },
  areaName: ({ area, governorate }: { area: string; governorate: string }) =>
    `${area} · ${governorate}`,
  amenityChecklist: {
    empty: 'لا مرافق في القائمة بعد',
    retiredKept: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `يبقى ${String(count)} مرفق لم تعد في قائمة المنصة مرتبطة بالمساحة.`,
        one: 'يبقى مرفق واحد لم يعد في قائمة المنصة مرتبطًا بالمساحة.',
        two: 'يبقى مرفقان لم يعودا في قائمة المنصة مرتبطين بالمساحة.',
        few: `تبقى ${String(count)} مرافق لم تعد في قائمة المنصة مرتبطة بالمساحة.`,
        many: `يبقى ${String(count)} مرفقًا لم تعد في قائمة المنصة مرتبطة بالمساحة.`,
        other: `يبقى ${String(count)} مرفق لم تعد في قائمة المنصة مرتبطة بالمساحة.`,
      }),
  },
  areaSelect: {
    placeholder: 'اختر المنطقة',
    hidden: ({ name }: { name: string }) => `${name} (مخفية)`,
    unavailable: 'المنطقة الحالية — لم تعد متاحة للاختيار',
  },
  areaFilter: {
    label: 'المنطقة',
    all: 'كل المناطق',
    chosen: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `${String(count)} منطقة محددة`,
        one: 'منطقة واحدة محددة',
        two: 'منطقتان محددتان',
        few: `${String(count)} مناطق محددة`,
        many: `${String(count)} منطقة محددة`,
        other: `${String(count)} منطقة محددة`,
      }),
    search: 'ابحث عن منطقة',
    searchPlaceholder: 'اسم المنطقة',
    list: 'المناطق',
    none: 'لا توجد منطقة بهذا الاسم',
    loading: 'جارٍ تحميل المناطق…',
    failed: 'تعذّر تحميل المناطق',
  },
} satisfies Catalogue['lookups'];
