import type { Catalogue } from '../shape';

export const USERS = {
  menu: ({ name }: { name: string }) => `قائمة الحساب: ${name}`,
  section: 'الحساب',
  dashboard: 'لوحة التحكم',
  signOut: 'تسجيل الخروج',
  signOutFailed: 'تعذّر تسجيل الخروج',
  passwordChange: {
    title: 'اختر كلمة مرور جديدة',
    description: 'هذه كلمة مرور مؤقتة من فريق مساحة، اختر كلمة مرور خاصة بك للمتابعة.',
    newPassword: 'كلمة المرور الجديدة',
    submit: 'حفظ والمتابعة',
    failed: 'تعذّر حفظ كلمة المرور',
    saved: 'حُفظت كلمة المرور الجديدة',
  },
  temporaryPassword: {
    title: 'كلمة المرور المؤقتة',
    copy: 'نسخ',
    copied: 'نُسخت',
    copyFailed: 'تعذّر النسخ — حدّدها وانسخها يدويًا.',
    line: 'سلّمها لصاحبها؛ سيُطلب منه تغييرها عند أول دخول.',
    channel: 'طريقة التسليم',
    channels: {
      WHATSAPP: 'واتساب',
      IN_PERSON: 'شفهيًا',
      OTHER: 'أخرى',
    },
    chooseChannel: 'اختر طريقة التسليم',
    copyFirst: 'انسخها أولًا — لن تظهر مرة أخرى',
    done: 'تم',
    recorded: ({ name, channel }: { name: string; channel: string }) =>
      `سُجّلت طريقة التسليم: ${name} · ${channel}`,
    failed: 'تعذّر تسجيل طريقة التسليم',
    notRecorded: 'لم تُسجَّل طريقة التسليم',
  },
} satisfies Catalogue['users'];
