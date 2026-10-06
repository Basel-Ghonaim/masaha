import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const LOOKUPS = {
  hint: 'مخفية: لا تظهر في الفلاتر والنماذج. المساحات المرتبطة بها تبقى كما هي. الترتيب هنا هو ترتيب الظهور.',
  governorates: {
    title: 'المحافظات والمناطق',
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
  row: {
    hidden: 'مخفية',
    shown: ({ name }: { name: string }) => `ظاهرة: ${name}`,
    moveUp: ({ name }: { name: string }) => `تحريك لأعلى: ${name}`,
    moveDown: ({ name }: { name: string }) => `تحريك لأسفل: ${name}`,
  },
  failure: {
    title: 'لم يُحفظ التغيير',
    orderChanged: 'تغيّر الترتيب في الأثناء، وعُرض الترتيب الجديد. حاول مرة أخرى.',
  },
} satisfies Catalogue['lookups'];
