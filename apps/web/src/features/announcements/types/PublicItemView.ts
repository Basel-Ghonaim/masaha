/** An announcement as a space's public page shows it: its type, its period and its text. */
export type PublicItemView = {
  type: { label: string; tone: 'warning' | 'neutral' };
  period: string;
  text: { text: string; lang?: 'ar'; dir?: 'rtl' };
};
