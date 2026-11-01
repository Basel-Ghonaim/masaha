import type { Catalogue } from '../shape';

export const DASHBOARD = {
  spaceNavigation: 'لوحة إدارة المساحة',
  adminNavigation: 'لوحة إدارة المنصة',
  platformAdmin: 'إدارة المنصة',
  menu: 'القائمة',
  publicPage: 'عرض الصفحة العامة',
  pages: {
    overview: 'نظرة عامة',
    desk: 'مكتب الاستقبال',
    customers: 'الزبائن',
    payments: 'الدفعات',
    myPayments: 'دفعاتي اليوم',
    finance: 'المالية والتقارير',
    packages: 'الباقات والأسعار',
    profile: 'ملف المساحة',
    announcements: 'الإعلانات',
    dataReports: 'بلاغات البيانات',
    staff: 'الموظفون',
    settings: 'الإعدادات',
    spaces: 'المساحات',
    owners: 'أصحاب المساحات',
    users: 'المستخدمون',
    lookups: 'القوائم',
    audit: 'سجل التدقيق',
    platformSettings: 'إعدادات المنصة',
  },
  groups: {
    today: 'اليوم',
    money: 'المال',
    space: 'المساحة',
    team: 'الفريق والإعدادات',
    spaces: 'المساحات',
    platform: 'المنصة',
  },
  badges: {
    newReports: 'بلاغات جديدة',
    reportsForAdmin: 'بلاغات بانتظار الإدارة',
  },
  addSpace: {
    title: 'إضافة مساحة',
    trail: 'مسار التنقل',
  },
  editSpace: {
    title: 'تعديل مساحة',
  },
} satisfies Catalogue['dashboard'];
