import { createContext } from 'react';
import type { PageTitle } from './PageTitle';

/** The record's name a page has given as its title, and the way to give or clear it. */
export type RecordTitle = {
  title: PageTitle | undefined;
  setTitle: (title: PageTitle | undefined) => void;
};

/** Held once, in the root layout (`RecordTitleProvider`); null outside it, where no record titles. */
export const RecordTitleContext = createContext<RecordTitle | null>(null);
