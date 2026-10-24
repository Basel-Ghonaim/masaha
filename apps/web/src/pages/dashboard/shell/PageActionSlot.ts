import { createContext } from 'react';

/**
 * The shell's bottom bar, for a page's one all-day action below 768 px (P1): where the page puts it,
 * once the shell has mounted, and `fill`, which shows the bar and makes room for it under the content
 * until the answer is called.
 */
export const PageActionSlot = createContext<{
  target: HTMLElement | null;
  fill: () => () => void;
}>({ target: null, fill: () => () => undefined });
