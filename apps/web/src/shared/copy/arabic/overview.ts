import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const OVERVIEW = {
  loadFailed: 'تعذّر تحميل النظرة العامة',
  owner: {
    attention: {
      title: 'يحتاج انتباهك',
      review: 'مراجعة',
      openDesk: 'فتح المكتب',
      view: 'عرض',
      missing: {
        badge: 'لم تُضف بعد',
        caption: 'لم يُحفظ هذا القسم بعد، فلا يراه الزوار.',
      },
      stale: {
        badge: 'قديمة',
        caption: ({ days }: { days: number }) =>
          arabicPlural(days, {
            zero: 'آخر تحديث اليوم',
            one: 'آخر تحديث قبل يوم واحد',
            two: 'آخر تحديث قبل يومين',
            few: `آخر تحديث قبل ${String(days)} أيام`,
            many: `آخر تحديث قبل ${String(days)} يومًا`,
            other: `آخر تحديث قبل ${String(days)} يوم`,
          }),
      },
      reports: {
        title: ({ count }: { count: number }) =>
          arabicPlural(count, {
            zero: 'لا بلاغات جديدة',
            one: 'بلاغ جديد',
            two: 'بلاغان جديدان',
            few: `${String(count)} بلاغات جديدة`,
            many: `${String(count)} بلاغًا جديدًا`,
            other: `${String(count)} بلاغ جديد`,
          }),
        caption: 'من زوار، عن معلومات في صفحة المساحة',
      },
      uncollected: {
        title: ({ count }: { count: number }) =>
          arabicPlural(count, {
            zero: 'لا زيارات غير محصّلة',
            one: 'زيارة واحدة لم تُحصَّل',
            two: 'زيارتان لم تُحصَّلا',
            few: `${String(count)} زيارات لم تُحصَّل`,
            many: `${String(count)} زيارة لم تُحصَّل`,
            other: `${String(count)} زيارة لم تُحصَّل`,
          }),
        caption: 'خرجت بلا دفع، أو سُجّل خروجها تلقائيًا',
      },
      unpriced: {
        title: ({ count }: { count: number }) =>
          arabicPlural(count, {
            zero: 'لا زيارات بلا سعر',
            one: 'زيارة واحدة بلا سعر',
            two: 'زيارتان بلا سعر',
            few: `${String(count)} زيارات بلا سعر`,
            many: `${String(count)} زيارة بلا سعر`,
            other: `${String(count)} زيارة بلا سعر`,
          }),
        caption: 'أُغلقت بلا سعر؛ حدّد سعرها من المكتب.',
      },
      owing: {
        title: ({ count }: { count: number }) =>
          arabicPlural(count, {
            zero: 'لا زبائن عليهم مبالغ',
            one: 'زبون واحد عليه مبلغ',
            two: 'زبونان عليهما مبالغ',
            few: `${String(count)} زبائن عليهم مبالغ`,
            many: `${String(count)} زبونًا عليهم مبالغ`,
            other: `${String(count)} زبون عليهم مبالغ`,
          }),
        caption: 'المبالغ في المالية › الديون',
      },
      closures: {
        title: ({ count }: { count: number }) =>
          arabicPlural(count, {
            zero: 'لا إغلاقات بانتظار التمديد',
            one: 'إغلاق لم تُمدَّد اشتراكاته',
            two: 'إغلاقان لم تُمدَّد اشتراكاتهما',
            few: `${String(count)} إغلاقات لم تُمدَّد اشتراكاتها`,
            many: `${String(count)} إغلاقًا لم تُمدَّد اشتراكاته`,
            other: `${String(count)} إغلاق لم تُمدَّد اشتراكاته`,
          }),
        caption: 'مدّد اشتراكات من شملهم الإغلاق، مرة واحدة.',
      },
      capacity: {
        title: 'لم تُحدَّد السعة',
        caption: 'بدونها لا تظهر حالة مباشرة للزوار.',
        action: 'تحديد السعة',
      },
      allClear: 'كل شيء على ما يرام',
    },
    present: {
      title: 'الحاضرون الآن',
      view: 'عرض الحاضرين',
      meter: 'نسبة الإشغال',
      meterValue: ({ total, capacity }: { total: string; capacity: string }) =>
        `${total} من ${capacity}`,
      now: ({ members, visits }: { members: string; visits: string }) =>
        `الآن: ${members} و${visits}`,
      members: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: 'لا مشتركين',
          one: 'مشترك واحد',
          two: 'مشتركان',
          few: `${String(count)} مشتركين`,
          many: `${String(count)} مشتركًا`,
          other: `${String(count)} مشترك`,
        }),
      visits: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: 'لا زيارات',
          one: 'زيارة واحدة',
          two: 'زيارتان',
          few: `${String(count)} زيارات`,
          many: `${String(count)} زيارة`,
          other: `${String(count)} زيارة`,
        }),
      noCapacity: 'حدّد السعة في الإعدادات لتظهر حالة مباشرة.',
      full: 'وصلت إلى السعة، فتظهر المساحة «ممتلئ».',
      hidden: 'السعة لا تظهر للزوار، فقط الحالة.',
    },
    announcements: { label: 'إعلانات نشطة' },
    ending: {
      title: 'اشتراكات تنتهي هذا الأسبوع',
      count: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: 'لا اشتراكات',
          one: 'اشتراك واحد',
          two: 'اشتراكان',
          few: `${String(count)} اشتراكات`,
          many: `${String(count)} اشتراكًا`,
          other: `${String(count)} اشتراك`,
        }),
      viewAll: 'عرض الكل',
      today: 'ينتهي اليوم',
      tomorrow: 'ينتهي غدًا',
      inDays: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: 'ينتهي اليوم',
          one: 'ينتهي غدًا',
          two: 'ينتهي بعد يومين',
          few: `ينتهي بعد ${String(count)} أيام`,
          many: `ينتهي بعد ${String(count)} يومًا`,
          other: `ينتهي بعد ${String(count)} يوم`,
        }),
      line: ({ subscription, ends }: { subscription: string; ends: string }) =>
        `${subscription} · ${ends}`,
      renew: 'تجديد',
      none: 'لا اشتراكات تنتهي هذا الأسبوع.',
    },
  },
} satisfies Catalogue['overview'];
