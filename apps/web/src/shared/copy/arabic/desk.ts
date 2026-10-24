import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const DESK = {
  actions: {
    checkIn: 'تسجيل زيارة',
    switchStaff: 'تبديل الموظف',
    more: 'إجراءات أخرى',
  },
  switchStaff: {
    failed: 'تعذّر الخروج من الحساب؛ أعد المحاولة.',
  },
  terms: {
    loadFailed: 'تعذّر تحميل أسعار الزيارات',
  },
  visit: {
    title: 'تسجيل زيارة',
    noRecord: 'لا يُنشأ ملف زبون.',
    rate: {
      hour: ({ hour }: { hour: string }) => `تُحسب ${hour} للساعة.`,
      hourCapped: ({ hour, day }: { hour: string; day: string }) =>
        `تُحسب ${hour} للساعة، حتى ${day}.`,
      day: ({ day }: { day: string }) => `تُحسب بسعر اليوم ${day}.`,
      none: 'لا سعر منشورًا؛ يُكتب المبلغ عند الخروج.',
    },
    name: 'الاسم',
    student: 'طالب',
    shift: 'الوردية',
    optional: 'اختياري',
    noShift: 'بدون وردية',
    full: 'المساحة ممتلئة؛ يمكنك التسجيل على أي حال، وتبقى حالتها للزوار «ممتلئ».',
    submit: 'تسجيل الزيارة',
    submitAnyway: 'تسجيل على أي حال',
    failed: 'تعذّر تسجيل الزيارة',
    done: ({ name }: { name: string }) => `سُجّلت زيارة ${name}`,
  },
  checkOut: {
    open: 'خروج',
    openName: ({ name }: { name: string }) => `خروج ${name}`,
    title: ({ name }: { name: string }) => `تسجيل خروج · ${name}`,
    visit: 'زيارة',
    studentVisit: 'زيارة · طالب',
    rows: { in: 'الدخول', out: 'الخروج', duration: 'المدة' },
    billed: ({ time }: { time: string }) => `مدة محسوبة ${time}`,
    cap: 'السقف: سعر اليوم',
    rounding: {
      UP_AFTER_MINUTES: ({ minutes }: { minutes: string }) => `تقريب لأعلى بعد ${minutes}`,
    },
    minutes: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: `${String(count)} دقيقة`,
        one: 'دقيقة واحدة',
        two: 'دقيقتين',
        few: `${String(count)} دقائق`,
        many: `${String(count)} دقيقة`,
        other: `${String(count)} دقيقة`,
      }),
    typed: {
      amount: 'مبلغ الزيارة (₪)',
      badge: 'سعر يدوي',
      help: 'لا سعر ساعة ولا سعر يوم منشور.',
      reason: 'سبب السعر',
    },
    unpriced: 'لا سعر لهذه الزيارة. تُغلق بدون سعر، ويحدّده المالك لاحقًا.',
    submit: ({ amount }: { amount: string }) => `خروج واستلام ${amount}`,
    submitNone: 'خروج بدون دفع',
    failed: 'تعذّر تسجيل الخروج',
    quoteChanged: ({ amount }: { amount: string }) =>
      `تغيّر المستحق إلى ${amount}؛ راجع المبلغ ثم أكّد.`,
    quoteFailed: 'تعذّر حساب المستحق',
    done: ({ name }: { name: string }) => `سُجّل خروج ${name}`,
  },
  money: {
    group: 'الدفع',
    due: 'المستحق',
    received: 'المستلم الآن (₪)',
    prefilled: 'مُلئ بالمستحق؛ غيّره إن دفع غيره.',
    method: 'الطريقة',
    methods: { CASH: 'نقدًا', TRANSFER: 'تحويل' },
    methodIn: { CASH: 'نقدًا', TRANSFER: 'تحويلًا' },
    full: 'يُسجَّل المبلغ كاملًا.',
    nothingDue: 'لا شيء مستحق الآن.',
    change: ({ amount }: { amount: string }) => `الباقي للزبون ${amount}`,
    credit: ({ amount }: { amount: string }) => `يصبح له رصيد ${amount}`,
    owes: ({ amount, name }: { amount: string; name: string }) =>
      `يبقى ${amount} دينًا على ${name}`,
    owesPhone: ({ amount }: { amount: string }) =>
      `يبقى ${amount} دينًا على صاحب رقم الجوال — رقم الجوال مطلوب`,
    onSubscription: ({ amount }: { amount: string }) => `يبقى ${amount} على الاشتراك`,
    none: 'لم يدفع شيئًا',
    all: 'استلام المبلغ كاملًا',
    amountInvalid: 'اكتب مبلغًا بالشيكل، حتى منزلتين عشريتين',
    amountZero: 'اكتب مبلغًا أكبر من صفر',
  },
  debt: {
    name: 'الاسم',
    phone: 'رقم الجوال',
    phoneRequired: 'رقم الجوال مطلوب ليُسجَّل المبلغ دينًا، مثل \u2066+970 59 000 0000\u2069',
    adds: ({ name }: { name: string }) => `يُضاف إلى ملف ${name}`,
  },
  toast: {
    paid: ({ amount, method }: { amount: string; method: string }) => `استُلم ${amount} ${method}`,
    notPaid: 'لم يدفع',
    unpriced: 'أُغلقت بدون سعر',
  },
  failure: {
    lost: 'لم يصل الرد. أعد المحاولة — لن تُسجَّل مرتين.',
    nothing: 'لم يُسجَّل شيء.',
  },
  refusals: {
    VISIT_ALREADY_CLOSED:
      'سجّل مكتب آخر خروج هذه الزيارة قبلك، فلم تُسجَّل هذه الدفعة. لا تأخذ المبلغ مرة ثانية.',
    PAYMENT_EXCEEDS_DUE: 'المبلغ أكبر من المستحق الآن؛ حُدّث المستحق.',
    VISIT_HAS_CUSTOMER: 'لهذه الزيارة زبون آخر؛ لا يُغيَّر رقمه هنا.',
    PRICE_TYPING_NOT_ALLOWED: 'لم يعد مسموحًا للاستقبال بكتابة سعر في هذه المساحة.',
    forbidden: 'لم يعد هذا متاحًا لك في هذه المساحة.',
    conflict: 'تعارض هذا الطلب مع طلب سابق؛ أغلق النافذة وأعد فتحها.',
    not_found: 'لم تعد هذه الزيارة موجودة.',
  },
} satisfies Catalogue['desk'];
