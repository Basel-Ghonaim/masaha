import { useEffect, useState } from 'react';
import { secondsLeft } from '../../services/secondsLeft';

/**
 * The whole seconds left before another link may be asked for, counting down to 0 from the window
 * the server answered (`seconds`, read at `since`). It counts from the server's window, so a reload
 * or another tab never starts it again. A new answer starts its own count.
 */
export function useResendCountdown(seconds: number, since: number): number {
  const [counted, setCounted] = useState({ seconds, since });
  const [left, setLeft] = useState(() => secondsLeft(seconds, since));

  // A new answer resets the count while rendering, so no frame shows the last one's. It has just
  // been read, so its window is whole.
  if (counted.seconds !== seconds || counted.since !== since) {
    setCounted({ seconds, since });
    setLeft(seconds);
  }

  useEffect(() => {
    if (seconds <= 0) return;
    // Counted against a deadline, so a late tick never stretches the wait.
    const timer = setInterval(() => {
      const remaining = secondsLeft(seconds, since);
      setLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [seconds, since]);

  return left;
}
