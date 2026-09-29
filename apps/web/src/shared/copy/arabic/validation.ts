import type { Catalogue } from '../shape';

export const VALIDATION = {
  required: 'هذا الحقل مطلوب.',
  too_short: 'القيمة أقصر من المسموح.',
  too_long: 'القيمة أطول من المسموح.',
  invalid_format: 'الصيغة غير صحيحة.',
  out_of_range: 'القيمة خارج النطاق المسموح.',
  not_unique: 'هذه القيمة مستخدمة من قبل.',
  invalid_choice: 'اختر أحد الخيارات المتاحة.',
} satisfies Catalogue['validation'];
