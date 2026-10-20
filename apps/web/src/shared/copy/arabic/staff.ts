import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const STAFF = {
  intro:
    'يصل موظف الاستقبال إلى المكتب والزبائن والإعلانات ودفعاته اليوم، ولا يرى المالية ولا الإعدادات.',
  label: 'الموظفون',
  count: ({ count }: { count: number }) =>
    arabicPlural(count, {
      zero: 'لا يوجد موظفون',
      one: 'موظف واحد',
      two: 'موظفان',
      few: `${String(count)} موظفين`,
      many: `${String(count)} موظفًا`,
      other: `${String(count)} موظف`,
    }),
  columns: { name: 'الاسم', status: 'الحالة', actions: 'إجراءات' },
  badges: {
    active: 'نشط',
    inactive: 'بلا وصول',
    pending: 'لم يغيّر كلمة المرور المؤقتة بعد',
    expired: 'انتهت صلاحية كلمة المرور المؤقتة',
  },
  loadFailed: 'تعذّر تحميل الموظفين',
  empty: {
    title: 'لا يوجد موظفون',
    text: 'يمكنك إدارة المكتب بنفسك أو إضافة موظف استقبال.',
  },
  add: {
    open: 'إضافة موظف',
    title: 'إضافة موظف',
    description: 'الدور: الاستقبال',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    notice:
      'يُنشأ حساب جديد لهذا البريد برمز مرور مؤقت يظهر لك مرة واحدة — جهّز طريقة تسليمه. لا يُربط حساب موجود.',
    submit: 'إنشاء حساب الاستقبال',
    failed: 'تعذّر إضافة الموظف',
    close: 'إغلاق',
    fieldErrors: {
      name: { required: 'أدخل الاسم', too_short: 'أدخل الاسم', too_long: 'الاسم أطول من المسموح' },
      email: {
        required: 'أدخل البريد الإلكتروني',
        invalid_format: 'أدخل بريدًا صحيحًا، مثل name@example.com',
        not_unique:
          'لهذا البريد حساب في مساحة، ولا يُربط حساب موجود. استخدم بريدًا آخر؛ وإن كان في قائمة موظفيك فمن صفّه: أعد وصوله، أو أصدر له كلمة مرور مؤقتة جديدة.',
      },
    },
    refusals: {
      forbidden: 'لم يعد هذا متاحًا لك في هذه المساحة؛ لم يُضف أحد.',
      not_found: 'لم تعد هذه المساحة متاحة لك.',
    },
  },
} satisfies Catalogue['staff'];
