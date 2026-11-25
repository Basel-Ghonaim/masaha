import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const FORMS = {
  password: {
    show: 'إظهار كلمة المرور',
    hide: 'إخفاء كلمة المرور',
  },
  passwordRules: {
    needs: '8 أحرف على الأقل، فيها حرف ورقم',
    missing: ({ parts }: { parts: readonly string[] }) => `ينقصها: ${parts.join(' و')}`,
    parts: {
      characters: ({ count }: { count: number }) =>
        arabicPlural(count, {
          zero: 'لا أحرف أخرى',
          one: 'حرف واحد آخر',
          two: 'حرفان آخران',
          few: `${String(count)} أحرف أخرى`,
          many: `${String(count)} حرفًا آخر`,
          other: `${String(count)} حرف آخر`,
        }),
      letter: 'حرف',
      digit: 'رقم',
    },
    fine: 'كلمة المرور مناسبة',
    tooLong: 'طويلة جدًا — اختصرها',
  },
  failure: {
    retryIn: ({ wait }: { wait: string }) => `محاولات كثيرة، حاول بعد ${wait}`,
    offlineTitle: 'تعذّر الاتصال',
    offlineDescription: 'تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.',
    reference: ({ id }: { id: string }) => `رقم المرجع: ${id}`,
  },
  listRange: ({ range, total }: { range: string; total: string }) => `عرض ${range} من ${total}`,
} satisfies Catalogue['forms'];
