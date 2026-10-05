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
  },
} satisfies Catalogue['dashboard'];
