import { createContext } from 'react';

/** The top bar's place for the page's title and its own controls, once the top bar has mounted. */
export const PageHeaderSlot = createContext<HTMLElement | null>(null);
