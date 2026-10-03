import type { Catalogue } from '../shape';

export const STATUS = {
  notFound: {
    title: 'الصفحة غير موجودة',
    description: 'ربما تغيّر الرابط أو حُذفت الصفحة.',
  },
  error: {
    title: 'حدث خطأ غير متوقع',
    description: 'لم يكن الخطأ منك. حاول مرة أخرى بعد قليل.',
  },
  offline: {
    title: 'لا يوجد اتصال بالإنترنت',
    description: 'ستظهر البيانات عند عودة الاتصال.',
  },
  retry: 'إعادة المحاولة',
} satisfies Catalogue['status'];
