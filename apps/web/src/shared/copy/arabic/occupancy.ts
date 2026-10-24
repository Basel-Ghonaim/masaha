import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const OCCUPANCY = {
  present: {
    title: 'الحاضرون الآن',
    table: 'قائمة الحاضرين',
    columns: {
      name: 'الاسم',
      kind: 'النوع',
      since: 'منذ',
      duration: 'المدة',
      detail: 'الاستخدام',
      actions: 'إجراءات',
    },
    kinds: { VISIT: 'زيارة', CHECK_IN: 'اشتراك' },
    soFar: ({ amount }: { amount: string }) => `حتى الآن ${amount}`,
    atCheckOut: 'يُحدَّد عند الخروج',
    since: ({ time }: { time: string }) => `منذ ${time}`,
    duration: ({ hours, minutes }: { hours: number; minutes: number }) =>
      `${String(hours)} س ${String(minutes)} د`,
    minutes: ({ minutes }: { minutes: number }) => `${String(minutes)} د`,
    subscribers: ({ count }: { count: number }) =>
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
    summary: ({ subscribers, visits }: { subscribers: string; visits: string }) =>
      `${subscribers} · ${visits}`,
    empty: {
      title: 'لا أحد حاضر الآن',
      text: 'سجّل زيارة لأول من يصل.',
    },
    loadFailed: 'تعذّر تحميل الحاضرين',
    refreshFailed: 'تعذّر التحديث؛ تظهر آخر قائمة.',
  },
  status: {
    line: ({ state }: { state: string }) => `يظهر للزوار: ${state}`,
    manual: ({ state, left }: { state: string; left: string }) =>
      `يظهر للزوار: ${state} يدويًا · ${left}`,
    name: ({ state }: { state: string }) => `يظهر للزوار: ${state} — غيّرها`,
    manualName: ({ state, left }: { state: string; left: string }) =>
      `يظهر للزوار: ${state} يدويًا، ${left} متبقية — غيّرها`,
    none: 'بلا حالة مباشرة',
  },
  override: {
    title: 'الحالة التي يراها الزوار',
    for: 'لمدة',
    durations: {
      MINUTES_30: '30 د',
      HOUR_1: 'ساعة',
      HOURS_2: 'ساعتان',
      UNTIL_CLOSING: 'حتى الإغلاق',
    },
    now: ({ state, left }: { state: string; left: string }) =>
      `الآن: ${state} يدويًا · ${left} متبقية`,
    back: 'العودة للحالة التلقائية',
    note: 'بعدها تعود الحالة تلقائيًا حسب الحضور.',
    replaces: 'يحلّ محل الضبط الحالي.',
    closed: 'لا تُضبط الحالة والمساحة مغلقة الآن.',
    done: ({ state }: { state: string }) => `تظهر المساحة «${state}» للزوار`,
    cleared: 'عادت الحالة تلقائية',
    failed: 'تعذّر ضبط الحالة',
  },
} satisfies Catalogue['occupancy'];
