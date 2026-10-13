/**
 * A page's title, ready to show: its text, and its language and direction when they are not the
 * interface's, as an English-only record name in the Arabic interface is.
 */
export type PageTitle = { text: string; lang?: 'en' | 'ar'; dir?: 'ltr' | 'rtl' };
