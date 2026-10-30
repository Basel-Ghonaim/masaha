import type { Catalogue } from '../shape';

export const PLATFORM_SETTINGS = {
  contact: {
    whatsapp: 'واتساب',
    email: 'بريد',
  },
  admin: {
    save: 'حفظ',
    discard: 'تجاهل التغييرات',
    unsaved: 'تغييرات غير محفوظة',
    saved: 'حُفظت الإعدادات',
    loadFailed: ({ card }: { card: string }) => `تعذّر تحميل «${card}»`,
    saveFailed: ({ card }: { card: string }) => `تعذّر حفظ «${card}»`,
    contact: {
      title: 'التواصل مع المنصة',
      description: 'يظهر في «عن مساحة» و«تواصل معنا».',
      email: 'البريد الإلكتروني',
      whatsapp: 'واتساب',
      placeholder: '+970 59 000 0000',
      helper: 'اتركه فارغًا ليختفي من الموقع.',
      errors: {
        email: { invalid_format: 'أدخل بريدًا صحيحًا' },
        whatsapp: { invalid_format: 'رقم غير صالح، مثل +970 59 000 0000' },
      },
    },
    staleness: {
      title: 'حداثة البيانات',
      description: 'بعدها يرى الزوار «قد يكون تغيّر» أو يُخفى السعر في المساحات غير الموثّقة.',
      prices: 'الأسعار (أيام)',
      other: 'باقي البيانات (أيام)',
      errors: {
        required: 'أدخل عدد الأيام',
        out_of_range: 'من 1 إلى 365 يومًا',
        invalid_format: 'عدد أيام صحيح',
      },
    },
    defaults: {
      title: 'الإعدادات الافتراضية للمساحات الجديدة',
      description: 'يغيّرها كل مالك لاحقًا من إعدادات مساحته.',
      autoCheckout: 'تسجيل خروج تلقائي عند الإغلاق',
      rounding: 'تقريب الزيارات',
      upAfter: 'تقريب لأعلى بعد عدد من الدقائق',
      minutes: 'بعد (دقائق)',
      half: 'لأقرب نصف ساعة',
      minute: 'بالدقيقة',
      cap: 'لا يتجاوز سعر اليوم',
    },
  },
} satisfies Catalogue['platformSettings'];
