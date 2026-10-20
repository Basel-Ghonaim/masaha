import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const SPACE_SETTINGS = {
  loadFailed: 'تعذّر تحميل الإعدادات',
  card: {
    save: 'حفظ',
    discard: 'تجاهل التغييرات',
    unsaved: 'تغييرات غير محفوظة',
    unchanged: 'لم يتغيّر شيء',
    saved: ({ card }: { card: string }) => `حُفظت إعدادات «${card}»`,
    failed: ({ card }: { card: string }) => `تعذّر حفظ «${card}»`,
  },
  pricing: {
    title: 'تسعير الزيارات',
    description: 'كيف يُحسب سعر الزيارة من أسعار الساعة واليوم.',
    pricesLink: 'الباقات والأسعار',
    rounding: 'التقريب',
    upAfter: 'تقريب لأعلى بعد',
    minutesLabel: 'دقائق التقريب',
    minutesUnit: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'دقيقة',
        one: 'دقيقة',
        two: 'دقيقتين',
        few: 'دقائق',
        many: 'دقيقة',
        other: 'دقيقة',
      }),
    twoHours: 'ساعتان',
    twoHoursAnd: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `ساعتان و${String(count)} دقيقة`,
        one: 'ساعتان ودقيقة',
        two: 'ساعتان ودقيقتان',
        few: `ساعتان و${String(count)} دقائق`,
        many: `ساعتان و${String(count)} دقيقة`,
        other: `ساعتان و${String(count)} دقيقة`,
      }),
    example: ({ under, over }: { under: string; over: string }) =>
      `${under} = ساعتان · ${over} = 3 ساعات`,
    half: 'لأقرب نصف ساعة',
    halfHint: 'ساعتان و20 دقيقة = ساعتان ونصف',
    minute: 'بالدقيقة',
    minuteHint: 'ساعتان و20 دقيقة تُحسب كما هي',
    cap: 'لا يتجاوز سعر اليوم',
    students: 'استخدام أسعار الطلاب للزيارات عند توفرها',
    fieldErrors: {
      minutes: {
        required: 'أدخل عدد الدقائق',
        out_of_range: 'من 1 إلى 59 دقيقة',
        invalid_format: 'من 1 إلى 59 دقيقة',
      },
    },
  },
  attendance: {
    title: 'الحضور والحالة المباشرة',
    capacity: 'السعة',
    capacityHelp: 'لا تظهر للزوار. بها تُحسب الحالة «ممتلئ»؛ بدونها لا تظهر حالة مباشرة.',
    autoOut: 'خروج تلقائي عند الإغلاق',
    autoOutHelp: 'يُسجَّل خروج من بقي عند موعد الإغلاق.',
    maxStay: 'خروج تلقائي بعد (ساعات)',
    maxStayHelp:
      'يُسجَّل خروج من يبقى أكثر من هذه المدة قبل الإغلاق. اتركه فارغًا ليكون الخروج عند الإغلاق فقط.',
    optional: 'اختياري',
    fieldErrors: {
      capacity: {
        out_of_range: 'عدد صحيح من 1 إلى 1000',
        invalid_format: 'عدد صحيح من 1 إلى 1000',
      },
      maxStay: { out_of_range: 'من 1 إلى 23 ساعة', invalid_format: 'عدد ساعات صحيح' },
    },
    partial: 'حُفظت السعة، ولم تُحفظ إعدادات الخروج التلقائي',
    forbiddenAfterCapacity: 'لم يعد هذا متاحًا لك في هذه المساحة.',
  },
  reception: {
    title: 'الاستقبال',
    switch: 'يكتب الاستقبال سعرًا يدويًا',
    help: 'لاشتراك مخصّص أو زيارة بلا سعر، مع سبب يُسجَّل. أنت تكتب السعر دائمًا.',
  },
  refusals: {
    forbidden: 'لم يعد هذا متاحًا لك في هذه المساحة؛ لم يُحفظ شيء.',
    not_found: 'لم تعد هذه المساحة متاحة لك.',
  },
} satisfies Catalogue['spaceSettings'];
