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
  menu: ({ name }: { name: string }) => `إجراءات: ${name}`,
  deactivate: {
    item: 'إيقاف وصوله',
    title: ({ name }: { name: string }) => `إيقاف وصول ${name}؟`,
    description:
      'تنتهي كل جلساته على كل الأجهزة فورًا، ولا يصل إلى هذه المساحة حتى تعيد وصوله. يبقى اسمه على الدفعات وفي السجل.',
    cancel: 'رجوع',
    confirm: 'إيقاف الوصول',
    failed: 'تعذّر إيقاف الوصول',
  },
  reactivate: {
    item: 'إعادة وصوله',
    failed: ({ name }: { name: string }) => `تعذّر إعادة وصول ${name}`,
  },
  reissue: {
    item: 'كلمة مرور مؤقتة جديدة',
    title: ({ name }: { name: string }) => `كلمة مرور مؤقتة جديدة لـ ${name}؟`,
    description:
      'تحلّ محلّ كلمة المرور المؤقتة السابقة وتنتهي جلساته، ويُطلب منه تغييرها عند أول دخول.',
    cancel: 'رجوع',
    confirm: 'إصدار',
    failed: 'تعذّر إصدار كلمة مرور مؤقتة',
    heldSettled: 'غيّر كلمة المرور المؤقتة؛ إن نسي كلمة مروره يستعيدها بالبريد.',
    heldInactive: 'أعد وصوله أولًا.',
  },
  refusals: {
    ACCOUNT_SUSPENDED: 'حسابه موقوف من فريق مساحة؛ لا يعود وصوله حتى يُسترجع حسابه.',
    ACCOUNT_IS_ADMIN: 'صار هذا الحساب حساب أدمن، ولا يعمل في الاستقبال.',
    ACCOUNT_HAS_LINKS: 'صار لهذا الحساب مساحة أخرى؛ يستعيد كلمة مروره من فريق مساحة.',
    TEMPORARY_PASSWORD_NOT_PENDING: 'غيّر كلمة المرور المؤقتة بالفعل؛ لا حاجة لأخرى.',
    not_found: 'لم يعد هذا الشخص من موظفي المساحة، أو لم تعد المساحة متاحة لك.',
    forbidden: 'لم يعد هذا متاحًا لك في هذه المساحة.',
  },
} satisfies Catalogue['staff'];
