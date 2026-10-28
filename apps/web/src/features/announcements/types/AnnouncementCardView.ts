/** One announcement of the list, ready to render as its card. */
export type AnnouncementCardView = {
  key: string;
  id: number;
  /** Its type, as its badge says it: `warning` for an outage or a closure (DI-15). */
  type: { label: string; tone: 'warning' | 'neutral' };
  /** Its period on Gaza's clock. */
  period: string;
  /** Its text in the interface's language, the Arabic marked when the English is missing (DI-27). */
  text: { text: string; lang?: 'ar'; dir?: 'rtl' };
  /** A closure's line about extending its subscriptions (DI-28), else none. */
  closureLine: string | null;
};
