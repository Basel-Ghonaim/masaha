import type { Catalogue } from '../shape';

export const SPACE_LINKS = {
  switchSpace: ({ name }: { name: string }) => `تبديل المساحة: ${name}`,
  yourSpaces: 'مساحاتك',
  chooseSpace: 'اختر مساحة',
  loadFailed: 'تعذّر تحميل مساحاتك',
} satisfies Catalogue['spaceLinks'];
