import { useEffect, useState } from 'react';

/** How long typing waits before it is taken as done. */
const PAUSE_MS = 400;

/** The text, once typing has paused for a moment. */
export function usePausedText(value: string): string {
  const [paused, setPaused] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaused(value);
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [value]);
  return paused;
}
