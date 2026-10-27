import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const PAYMENTS = {
  ledger: {
    label: 'سجل الدفعات',
    columns: {
      date: 'التاريخ',
      customer: 'الزبون',
      amount: 'المبلغ',
      recorder: 'سجّلها',
      actions: 'إجراءات',
    },
    visit: 'زيارة',
    noName: 'زائر',
    range: {
      label: 'الفترة',
      choose: 'اختر الفترة',
      today: 'اليوم',
      tooLong: 'أطول فترة 92 يومًا؛ اختر فترة أقصر.',
      previous: 'الشهر السابق',
      next: 'الشهر التالي',
    },
    staff: {
      label: 'الموظف',
      all: 'كل الموظفين',
      self: ({ name }: { name: string }) => `${name} (أنت)`,
      inactive: ({ name }: { name: string }) => `${name} · موقوف`,
    },
    method: { label: 'الطريقة', all: 'كل الطرق' },
    kind: {
      label: 'النوع',
      all: 'كل الأنواع',
      VISIT: 'زيارات',
      SUBSCRIPTION: 'اشتراكات',
    },
    voided: {
      chip: 'إظهار الملغاة',
      quick: 'تصفية سريعة',
      badge: 'ملغاة',
      line: ({ name, reason }: { name: string; reason: string }) => `ألغاها ${name}: ${reason}`,
    },
    filters: {
      title: 'الفلاتر',
      clear: 'مسح الفلاتر',
      none: 'لا نتائج — غيّر الفلاتر',
      applied: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: 'لا فلاتر مطبّقة',
          one: 'فلتر واحد مطبّق',
          two: 'فلتران مطبّقان',
          few: `${String(count)} فلاتر مطبّقة`,
          many: `${String(count)} فلترًا مطبّقًا`,
          other: `${String(count)} فلتر مطبّق`,
        }),
      show: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: `عرض ${String(count)} دفعة`,
          one: 'عرض الدفعة',
          two: 'عرض الدفعتين',
          few: `عرض ${String(count)} دفعات`,
          many: `عرض ${String(count)} دفعة`,
          other: `عرض ${String(count)} دفعة`,
        }),
      close: 'إغلاق',
    },
    count: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا دفعات',
        one: 'دفعة واحدة',
        two: 'دفعتان',
        few: `${String(count)} دفعات`,
        many: `${String(count)} دفعة`,
        other: `${String(count)} دفعة`,
      }),
    totals: ({
      period,
      received,
      cash,
      transfer,
      count,
    }: {
      period: string;
      received: string;
      cash: string;
      transfer: string;
      count: string;
    }) => `${period} · المجموع ${received} · نقدًا ${cash} · تحويل ${transfer} · ${count}`,
    totalsVoided: ({ count, amount }: { count: string; amount: string }) =>
      `الملغاة: ${count} · ${amount}`,
    emptyToday: {
      title: 'لا توجد دفعات اليوم',
      text: 'تظهر هنا كل دفعة تُسجَّل في مكتب الاستقبال. اختر فترة لترى ما قبل اليوم.',
    },
    noMatch: {
      title: 'لا توجد دفعات تطابق الفلاتر',
      text: 'غيّر الفترة أو الفلاتر.',
    },
    loadFailed: 'تعذّر تحميل الدفعات',
    pagination: {
      label: 'صفحات الدفعات',
      previous: 'السابق',
      next: 'التالي',
      page: ({ page }: { page: number }) => `الصفحة ${String(page)}`,
      summary: ({ page, total }: { page: number; total: number }) =>
        `صفحة ${String(page)} من ${String(total)}`,
      more: 'صفحات أخرى',
    },
  },
} satisfies Catalogue['payments'];
