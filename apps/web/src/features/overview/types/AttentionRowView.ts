/** One row of «يحتاج انتباهك», ready to render: what waits, why, and where it is acted on. */
export type AttentionRowView = {
  key: string;
  title: string;
  /** A fact group's state («لم تُضف بعد», «قديمة»), always a warning; none for a count. */
  badge: string | null;
  caption: string;
  action: { label: string; href: string };
};
