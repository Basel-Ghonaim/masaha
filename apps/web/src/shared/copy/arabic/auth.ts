import type { Catalogue } from '../shape';

export const AUTH = {
  fields: {
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    emailExample: 'name@example.com',
    password: 'كلمة المرور',
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
    submit: 'تسجيل الدخول',
    failed: 'تعذّر تسجيل الدخول',
  },
  register: {
    submit: 'إنشاء الحساب',
    failed: 'تعذّر إنشاء الحساب',
  },
} satisfies Catalogue['auth'];
