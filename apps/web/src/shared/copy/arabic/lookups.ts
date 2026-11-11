import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const LOOKUPS = {
  governorates: {
    title: 'المحافظات والمناطق',
    hint: 'مخفية: لا تظهر في الفلاتر والنماذج. المساحات المرتبطة بها تبقى كما هي. الترتيب هنا هو ترتيب الظهور.',
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
    hint: 'غير النشط لا يظهر في النماذج، وتحتفظ به المساحات التي لديها. الترتيب هنا هو ترتيب الظهور.',
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
    moveUp: ({ name, position, count }: { name: string; position: number; count: number }) =>
      `تحريك لأعلى: ${name} — ${String(position)} من ${String(count)}`,
    moveDown: ({ name, position, count }: { name: string; position: number; count: number }) =>
      `تحريك لأسفل: ${name} — ${String(position)} من ${String(count)}`,
    moved: ({ name, position, count }: { name: string; position: number; count: number }) =>
      `${name}: ${String(position)} من ${String(count)}`,
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
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    position: 'الترتيب',
    positionRange: ({ count }: { count: number }) => `من 1 إلى ${String(count)}`,
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
  areaLine: ({ area, governorate }: { area: string; governorate: string }) =>
    `${area}، ${governorate}`,
  amenityChecklist: {
    empty: 'لا مرافق في القائمة بعد',
    retired: 'أُزيل من القائمة',
  },
  areaSelect: {
    placeholder: 'اختر المنطقة',
    hidden: ({ name }: { name: string }) => `${name} (مخفية)`,
    unavailable: 'المنطقة الحالية — لم تعد متاحة للاختيار',
    search: {
      label: 'ابحث عن منطقة',
      placeholder: 'اسم المنطقة أو المحافظة',
      list: 'المناطق',
      empty: 'لا توجد منطقة بهذا الاسم',
    },
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
    max: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `يمكن اختيار ${String(count)} منطقة على الأكثر.`,
        one: 'يمكن اختيار منطقة واحدة على الأكثر.',
        two: 'يمكن اختيار منطقتين على الأكثر.',
        few: `يمكن اختيار ${String(count)} مناطق على الأكثر.`,
        many: `يمكن اختيار ${String(count)} منطقة على الأكثر.`,
        other: `يمكن اختيار ${String(count)} منطقة على الأكثر.`,
      }),
  },
} satisfies Catalogue['lookups'];
