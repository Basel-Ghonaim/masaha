import type { Catalogue } from '../shape';

export const MAP = {
  attribution: '© مساهمو OpenStreetMap',
  zoomIn: 'تكبير',
  zoomOut: 'تصغير',
  failed: 'لم تُحمَّل الخريطة. أدخل الإحداثيات بدلًا منها.',
  pin: ({ point }: { point: string }) => `الدبوس عند ${point}`,
} satisfies Catalogue['map'];
