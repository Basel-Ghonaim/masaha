import type { Catalogue } from '../shape';

const GOOGLE_NOT_CONFIRMED =
  'لم يتمكّن Google من تأكيد حسابك. حاول مرة أخرى، أو استخدم البريد الإلكتروني وكلمة المرور.';

export const AUTH = {
  fields: {
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    emailExample: 'name@example.com',
    password: 'كلمة المرور',
  },
  or: 'أو',
  google: {
    failed: 'تعذّرت المتابعة باستخدام Google',
    lines: {
      GOOGLE_TOKEN_INVALID: GOOGLE_NOT_CONFIRMED,
      GOOGLE_LINK_NOT_ALLOWED:
        'يوجد حساب بهذا البريد الإلكتروني. سجّل الدخول بكلمة مروره، أو أعد تعيينها من «نسيت كلمة المرور».',
      service_unavailable:
        'الدخول باستخدام Google غير متاح الآن. استخدم البريد الإلكتروني وكلمة المرور، أو حاول لاحقًا.',
      validation: GOOGLE_NOT_CONFIRMED,
    },
    scriptFailed: 'تعذّر تحميل الدخول باستخدام Google. تحقّق من اتصالك ثم أعد تحميل الصفحة.',
    linkedTitle: 'ربطنا حساب Google بحسابك',
    linkedDescription:
      'حُذفت كلمة مرور حسابك وسُجّل خروجك من الأجهزة الأخرى. لتعيين كلمة مرور جديدة، استخدم «نسيت كلمة المرور».',
  },
  fieldErrors: {
    name: {
      too_short: 'أدخل اسمك',
    },
    email: {
      invalid_format: 'تحقّق من كتابة البريد الإلكتروني، مثل \u2066name@example.com\u2069',
    },
    currentPassword: {
      too_short: 'أدخل كلمة المرور',
    },
    newPassword: {
      too_short: 'كلمة المرور لا تستوفي الشروط أدناه',
      invalid_format: 'كلمة المرور لا تستوفي الشروط أدناه',
    },
  },
  signIn: {
    title: 'تسجيل الدخول',
    description:
      'سجّل الدخول لمتابعة مساحاتك المفضّلة والبلاغات التي أرسلتها عن المعلومات الخاطئة.',
    submit: 'تسجيل الدخول',
    failed: 'تعذّر تسجيل الدخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟',
    createAccount: 'إنشاء حساب',
    browseWithoutAccount: 'تصفّح المساحات بدون حساب',
  },
  register: {
    title: 'إنشاء حساب',
    description: 'احفظ مساحاتك المفضّلة وتابع البلاغات التي ترسلها.',
    submit: 'إنشاء الحساب',
    failed: 'تعذّر إنشاء الحساب',
    haveAccount: 'لديك حساب؟',
    signIn: 'تسجيل الدخول',
    signInInstead: 'سجّل الدخول بهذا البريد',
    ownerNote: 'تدير مساحة عمل؟ حسابات أصحاب المساحات ينشئها فريق مساحة.',
    welcome: ({ name }: { name: string }) => `أهلًا ${name}، تم إنشاء حسابك`,
  },
  forgotPassword: {
    title: 'نسيت كلمة المرور',
    description: 'أدخل البريد الذي سجّلت به، وسنرسل إليه رابطًا لتعيين كلمة مرور جديدة.',
    submit: 'أرسل رابط الاستعادة',
    failed: 'تعذّر إرسال الرابط',
    sentTitle: 'تفقّد بريدك الإلكتروني',
    sentMessage:
      'إذا كان هذا البريد مسجّلًا لدينا، ستصلك رسالة فيها رابط لتعيين كلمة مرور جديدة. الرابط صالح لمدة ساعة. تفقّد مجلد الرسائل غير المرغوب فيها.',
    sentTo: ({ email }: { email: string }) => `أُرسلت إلى ${email}`,
    resend: 'أعد الإرسال',
    resendIn: ({ wait }: { wait: string }) => `أعد الإرسال بعد ${wait}`,
    resendFailed: 'تعذّرت إعادة إرسال الرابط',
    enterEmailAgain: 'أدخل بريدك الإلكتروني من جديد',
    linkOpenTitle: 'فتحت رابط الاستعادة',
    linkOpenDescription: ({ email }: { email: string }) =>
      `للحساب ${email}. عيّن كلمة المرور الجديدة، أو اطلب رابطًا جديدًا.`,
    continue: 'تعيين كلمة مرور جديدة',
    noEmailAccess: 'لا يمكنك الوصول إلى بريدك؟',
    contactUs: 'تواصل معنا',
    backToSignIn: 'العودة إلى تسجيل الدخول',
  },
  resetPassword: {
    title: 'تعيين كلمة مرور جديدة',
    forAccount: ({ email }: { email: string }) => `للحساب ${email}`,
    newPassword: 'كلمة المرور الجديدة',
    submit: 'حفظ كلمة المرور',
    failed: 'تعذّر حفظ كلمة المرور',
    checkFailedTitle: 'تعذّر التحقّق من الرابط',
    reopenLink: 'افتح الرابط من بريدك الإلكتروني مرة أخرى.',
    invalidTitle: 'انتهت صلاحية الرابط أو استُخدم من قبل',
    invalidDescription: 'روابط الاستعادة صالحة لمدة ساعة ولمرة واحدة فقط.',
    requestNewLink: 'اطلب رابطًا جديدًا',
    doneTitle: 'تم تغيير كلمة المرور، وسُجّل خروجك من كل الأجهزة',
    doneDescription: 'سجّل الدخول بكلمة المرور الجديدة.',
    signIn: 'تسجيل الدخول',
  },
} satisfies Catalogue['auth'];
