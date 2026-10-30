import type { Catalogue } from '../shape';

export const FINANCE = {
  loadFailed: 'تعذّر تحميل المالية',
  tabs: { label: 'التقارير', income: 'الدخل', debts: 'الديون', occupancy: 'الإشغال' },
  month: 'الشهر',
  export: {
    more: 'إجراءات أخرى',
    income: 'تصدير الدخل (CSV)',
    debts: 'تصدير الديون (CSV)',
    occupancy: 'تصدير الإشغال (CSV)',
    done: 'نُزّل الملف',
  },
  income: {
    definition: 'الدخل = المبالغ المقبوضة فعليًا، بدون الدفعات الملغاة.',
    today: 'اليوم',
    upTo: ({ time }: { time: string }) => `حتى ${time}`,
    vsPrevious: ({ change, month }: { change: string; month: string }) => `${change} عن ${month}`,
    allTime: 'منذ البداية',
    since: ({ month }: { month: string }) => `منذ ${month}`,
    noPayments: 'لا دفعات بعد',
    series: { subscriptions: 'اشتراكات', visits: 'زيارات' },
    byMonth: {
      title: 'الدخل حسب الشهر',
      description: 'آخر 12 شهرًا',
      chart: 'الدخل حسب الشهر، آخر 12 شهرًا',
      period: 'الشهر',
    },
    byDay: {
      title: 'دخل الزيارات يوميًا',
      description: 'آخر 30 يومًا',
      chart: 'دخل الزيارات يوميًا، آخر 30 يومًا',
      period: 'اليوم',
    },
    collections: {
      title: 'التحصيل حسب الموظف',
      columns: {
        staff: 'الموظف',
        count: 'العدد',
        total: 'المجموع',
        cash: 'نقدًا',
        transfer: 'تحويل',
      },
      none: 'لا تحصيل في هذا الشهر.',
    },
    csv: { month: 'الشهر', subscriptions: 'اشتراكات', visits: 'زيارات', total: 'المجموع' },
  },
} satisfies Catalogue['finance'];
