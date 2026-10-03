import type { Catalogue } from '../shape';

export const PREFERENCES = {
  languageName: 'العربية',
  switchTheme: {
    light: 'المظهر الداكن',
    dark: 'المظهر الفاتح',
  },
} satisfies Catalogue['preferences'];
