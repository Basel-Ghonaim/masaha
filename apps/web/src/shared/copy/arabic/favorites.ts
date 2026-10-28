import type { Catalogue } from '../shape';

export const FAVORITES = {
  save: ({ name }: { name: string }) => `حفظ ${name} في المفضّلة`,
  remove: ({ name }: { name: string }) => `إزالة ${name} من المفضّلة`,
  added: 'أُضيفت إلى المفضّلة',
  removed: 'أُزيلت من المفضّلة',
  undo: 'تراجع',
  saveFailed: ({ name }: { name: string }) => `تعذّر حفظ ${name} في المفضّلة`,
  removeFailed: ({ name }: { name: string }) => `تعذّرت إزالة ${name} من المفضّلة`,
  savedOnReturn: ({ name }: { name: string }) => `حُفظت ${name} في المفضّلة`,
  gone: 'لم تعد هذه المساحة في الدليل.',
  manage: 'إدارة المفضّلة',
} satisfies Catalogue['favorites'];
