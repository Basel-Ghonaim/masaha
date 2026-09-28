import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches now, updated when it changes. Read during render, so a component
 * starts in the right layout with no flash. Inside the showcase's iframe it follows the iframe's
 * width, as it would on a device.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
  );
}
