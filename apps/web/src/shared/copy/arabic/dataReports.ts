import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const DATA_REPORTS = {
  fields: {
    PRICES: 'الأسعار',
    HOURS: 'ساعات العمل',
    CONTACT: 'التواصل',
    LOCATION: 'الموقع',
    AMENITIES: 'المرافق',
    OTHER: 'أخرى',
  },
  statuses: {
    staff: { OPEN: 'جديد', RESOLVED: 'تم التصحيح', DISMISSED: 'لم يُعتمد' },
    reporter: { OPEN: 'قيد المراجعة', RESOLVED: 'تم التصحيح', DISMISSED: 'لم يُعتمد' },
  },
  chips: { label: 'تصفية حسب الحالة', all: 'الكل', open: 'جديدة', decided: 'تمت المراجعة' },
  space: {
    label: 'بلاغات البيانات',
    intro: 'بلاغات الزوار عن معلومات خاطئة في صفحة المساحة.',
    columns: {
      field: 'الحقل',
      report: 'البلاغ',
      date: 'التاريخ',
      status: 'الحالة',
      actions: 'إجراءات',
    },
  },
  count: ({ count }: { count: number }) =>
    arabicPlural(count, {
      zero: 'لا بلاغات',
      one: 'بلاغ واحد',
      two: 'بلاغان',
      few: `${String(count)} بلاغات`,
      many: `${String(count)} بلاغًا`,
      other: `${String(count)} بلاغ`,
    }),
  open: 'فتح',
  view: 'عرض',
  visitor: 'زائر',
  noMessage: 'لم يكتب المُبلِّغ تفاصيل.',
  byline: ({ who, day }: { who: string; day: string }) => `${who} · ${day}`,
  empty: {
    title: 'لا توجد بلاغات',
    text: 'عندما يبلّغ زائر عن معلومة خاطئة تظهر هنا.',
  },
  noMatch: 'لا توجد بلاغات تطابق الفلاتر',
  showAll: 'عرض الكل',
  loadFailed: 'تعذّر تحميل البلاغات',
  pagination: {
    label: 'صفحات البلاغات',
    previous: 'السابق',
    next: 'التالي',
    page: ({ page }: { page: number }) => `الصفحة ${String(page)}`,
    summary: ({ page, total }: { page: number; total: number }) =>
      `صفحة ${String(page)} من ${String(total)}`,
    more: 'صفحات أخرى',
  },
  sheet: {
    title: ({ field }: { field: string }) => `بلاغ عن ${field}`,
    report: 'البلاغ',
    editField: 'تعديل الحقل',
    replySpace: 'ردّ إدارة المساحة',
    replyTeam: 'ردّ فريقنا',
    replyHelper: 'يظهر لصاحب البلاغ. مطلوب لـ«لم يُعتمد»، واختياري لـ«تم التصحيح».',
    replyRequired: 'اكتب السبب؛ هو ما سيقرؤه صاحب البلاغ.',
    resolve: 'تم التصحيح',
    dismiss: 'لم يُعتمد',
    failed: 'تعذّر حفظ القرار',
    lost: 'لم يصل الرد. أعد المحاولة — القرار نفسه لا يُسجَّل مرتين.',
    decided: 'القرار',
    reply: ({ text }: { text: string }) => `الردّ: ${text}`,
    noReply: 'بلا ردّ',
    gone: 'لم يعد هذا البلاغ موجودًا.',
    close: 'إغلاق',
  },
  toast: {
    resolved: 'عُلّم «تم التصحيح»',
    dismissed: 'عُلّم «لم يُعتمد»',
    replied: 'أُرسل الردّ لصاحب البلاغ.',
    inDecided: 'في «تمت المراجعة»',
    show: 'عرض',
  },
} satisfies Catalogue['dataReports'];
