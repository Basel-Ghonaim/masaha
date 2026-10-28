import { arabicPlural } from '../plural';
import type { Catalogue } from '../shape';

export const FAVORITES = {
  save: ({ name }: { name: string }) => `حفظ ${name} في المفضّلة`,
  remove: ({ name }: { name: string }) => `إزالة ${name} من المفضّلة`,
  added: 'أُضيفت إلى المفضّلة',
  removed: 'أُزيلت من المفضّلة',
  removedLeft: ({ name }: { name: string }) =>
    `أُزيلت ${name} من المفضّلة. لا يمكن حفظها من جديد ما دامت خارج الدليل.`,
  undo: 'تراجع',
  saveFailed: ({ name }: { name: string }) => `تعذّر حفظ ${name} في المفضّلة`,
  removeFailed: ({ name }: { name: string }) => `تعذّرت إزالة ${name} من المفضّلة`,
  savedOnReturn: ({ name }: { name: string }) => `حُفظت ${name} في المفضّلة`,
  gone: 'لم تعد هذه المساحة في الدليل.',
  manage: 'إدارة المفضّلة',
  list: {
    title: 'المفضّلة',
    description: 'المساحات التي حفظتها، بحالتها الآن.',
    count: ({ count }: { count: number }) =>
      arabicPlural(count, {
        zero: 'لا مساحات محفوظة',
        one: 'مساحة واحدة محفوظة',
        two: 'مساحتان محفوظتان',
        few: `${String(count)} مساحات محفوظة`,
        many: `${String(count)} مساحة محفوظة`,
        other: `${String(count)} مساحة محفوظة`,
      }),
    gone: 'لم تعد هذه المساحة معروضة في الدليل',
    remove: 'إزالة',
    empty: {
      title: 'لم تحفظ أي مساحة بعد',
      text: 'اضغط على القلب في صفحة أي مساحة لتجدها هنا.',
    },
    loadFailed: 'تعذّر تحميل المفضّلة',
    region: 'المساحات المحفوظة',
  },
} satisfies Catalogue['favorites'];
