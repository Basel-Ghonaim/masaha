import type { Catalogue } from '../shape';

export const FORMS = {
  password: {
    show: 'إظهار كلمة المرور',
    hide: 'إخفاء كلمة المرور',
  },
  passwordRules: {
    label: 'شروط كلمة المرور',
    rules: {
      minLength: '8 أحرف على الأقل',
      letter: 'حرف واحد على الأقل',
      digit: 'رقم واحد على الأقل',
    },
    met: '— تحقّق',
    notMet: '— لم يتحقّق بعد',
  },
  failure: {
    retryIn: ({ wait }: { wait: string }) => `محاولات كثيرة، حاول بعد ${wait}`,
    offlineTitle: 'تعذّر الاتصال',
    offlineDescription: 'تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.',
    reference: ({ id }: { id: string }) => `رقم المرجع: ${id}`,
  },
} satisfies Catalogue['forms'];
