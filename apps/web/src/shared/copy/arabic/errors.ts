import type { Catalogue } from '../shape';

export const ERRORS = {
  bad_request: 'تعذّر فهم الطلب. حاول مرة أخرى.',
  unauthorized: 'سجّل الدخول للمتابعة.',
  forbidden: 'ليست لديك صلاحية للقيام بهذا.',
  not_found: 'لم نجد ما تبحث عنه.',
  conflict: 'يتعارض هذا مع تغيير سابق. حدّث الصفحة وحاول مرة أخرى.',
  payload_too_large: 'حجم الملف كبير جدًا.',
  unsupported_media_type: 'نوع الملف غير مدعوم.',
  validation: 'بعض الحقول تحتاج إلى تصحيح.',
  rate_limit: 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  server: 'حدث خطأ من جهتنا. حاول مرة أخرى.',
  service_unavailable: 'الخدمة غير متاحة مؤقتًا. حاول بعد قليل.',

  network: 'لا يوجد اتصال. تحقّق من الإنترنت وحاول مرة أخرى.',
  timeout: 'استغرق الخادم وقتًا طويلًا للردّ. حاول مرة أخرى.',
  canceled: 'أُلغي الطلب.',
  unknown: 'حدث خطأ ما. حاول مرة أخرى.',

  EMAIL_TAKEN: 'يوجد حساب بهذا البريد الإلكتروني.',
  PHONE_TAKEN: 'رقم الهاتف هذا مستخدم من قبل.',
  INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  ACCOUNT_SUSPENDED: 'هذا الحساب موقوف.',
  PASSWORD_CHANGE_REQUIRED: 'غيّر كلمة المرور المؤقتة للمتابعة.',
  SPACE_NOT_MANAGED: 'أنت لا تدير هذه المساحة.',
  MEMBER_ALREADY_CHECKED_IN: 'حضور هذا الزبون مسجّل بالفعل.',
  CHECK_IN_ALREADY_CLOSED: 'سُجّل الخروج لهذا الحضور بالفعل.',
  SPACE_CAPACITY_NOT_SET: 'حدّد سعة المساحة أولًا.',
  OUTSIDE_OPENING_HOURS: 'سُجّل هذا الحضور خارج ساعات عمل المساحة.',
  OWNER_ALREADY_LINKED: 'صاحب المساحة هذا مرتبط بها بالفعل.',
  CURRENT_PASSWORD_INCORRECT: 'كلمة المرور الحالية غير صحيحة.',
  GOOGLE_TOKEN_INVALID:
    'تعذّر تسجيل الدخول باستخدام Google، حاول مرة أخرى أو استخدم البريد الإلكتروني.',
  RESET_TOKEN_INVALID: 'انتهت صلاحية الرابط أو استُخدم من قبل.',
  GOOGLE_LINK_NOT_ALLOWED:
    'يوجد حساب بهذا البريد الإلكتروني. سجّل الدخول بكلمة المرور، أو أعد تعيينها إن نسيتها.',
  PASSWORD_NOT_SET:
    'لا توجد كلمة مرور لهذا الحساب بعد. لتعيينها، اطلب رابطًا من «نسيت كلمة المرور» وسيصلك على بريدك.',
} satisfies Catalogue['errors'];
