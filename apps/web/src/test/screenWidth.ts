import { vi } from 'vitest';

/**
 * jsdom has no media queries. This stand-in answers the (min-width: …px) queries the layout asks
 * against `width`, the screen's width; `vi.unstubAllGlobals()` removes it.
 */
export function stubScreenWidth(width: number): void {
  vi.stubGlobal('matchMedia', (query: string) => {
    const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query);
    return {
      matches: minWidth !== null && width >= Number(minWidth[1]),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  });
}
