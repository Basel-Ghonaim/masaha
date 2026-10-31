import type { Catalogue } from '../shape';

export const STATUS = {
  notFound: {
    title: 'الصفحة غير موجودة',
    description: 'ربما تغيّر الرابط أو حُذفت الصفحة.',
  },
  forbidden: {
    title: 'لا تملك صلاحية الوصول إلى هذه الصفحة',
    description: 'هذه الصفحة غير متاحة لحسابك.',
    mistake: 'إن كنت تظن أن هذا خطأ، تواصل معنا.',
  },
  error: {
    title: 'حدث خطأ غير متوقع',
    description: 'المشكلة عندنا، لا عندك. حاول مرة أخرى بعد قليل.',
  },
  offline: {
    title: 'لا يوجد اتصال بالإنترنت',
    description: 'ستظهر البيانات عند عودة الاتصال.',
  },
  retry: 'إعادة المحاولة',
  stillOffline: 'ما زال الاتصال مفقودًا.',
  stillFailing: 'ما زال الخطأ قائمًا. حاول بعد قليل.',
  loading: 'جارٍ التحميل',
  toasts: {
    label: 'الإشعارات',
    close: 'إغلاق الإشعار',
  },
} satisfies Catalogue['status'];
