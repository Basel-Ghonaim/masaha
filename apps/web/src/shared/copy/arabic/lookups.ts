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
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    active: 'نشطة',
    activeHint: 'مخفية: لا تظهر في الفلاتر والنماذج.',
    save: 'حفظ',
    close: 'إغلاق',
    saveFailed: 'تعذّر الحفظ',
    fieldErrors: {
      nameAr: { too_short: 'أدخل الاسم بالعربية' },
      nameEn: { too_short: 'أدخل الاسم بالإنجليزية' },
      governorateTaken: 'توجد محافظة أخرى بهذا الاسم العربي',
      areaTaken: 'توجد منطقة أخرى في هذه المحافظة بهذا الاسم العربي',
    },
  },
} satisfies Catalogue['lookups'];
