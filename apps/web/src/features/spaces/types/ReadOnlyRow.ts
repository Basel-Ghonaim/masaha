/** One value of a read-only section: its label, and its text in its own language, or none. */
export type ReadOnlyRow = {
  label: string;
  value: string | null;
  lang?: 'ar' | 'en';
  dir?: 'rtl' | 'ltr';
};
