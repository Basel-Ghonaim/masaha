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
  accountActions: {
    suspend: 'إيقاف',
    restore: 'استرجاع الحساب',
    restored: ({ name }: { name: string }) => `استُرجع حساب ${name}`,
    restoreFailed: ({ name }: { name: string }) => `تعذّر استرجاع حساب ${name}`,
  },
  suspend: {
    title: ({ name }: { name: string }) => `إيقاف ${name}؟`,
    line: 'تنتهي كل جلساته فورًا ولا يدخل حتى تسترجع حسابه.',
    ownerLine: 'تبقى مساحاته موثّقة، ولا يعدّلها فريق مساحة إلا بعد فك ربطه.',
    deskLine: 'يبقى رابطه بمكتب الاستقبال، ولا يعمل فيه حتى يُسترجع.',
    confirm: 'إيقاف',
    cancel: 'رجوع',
    failed: 'لم يُوقَف الحساب',
    refusals: { not_found: 'لم يعد هذا الحساب موجودًا.' },
    suspended: ({ name }: { name: string }) => `أُوقف ${name}، وانتهت جلساته`,
  },
} satisfies Catalogue['users'];
