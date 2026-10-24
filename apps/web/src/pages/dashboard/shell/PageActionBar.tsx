import { useMediaQuery } from '@shared/design-system';
import { showActionBar } from '@shared/routing';
import { use, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageActionSlot } from './PageActionSlot';

/**
 * The page's one all-day action in a bar fixed at the foot of the screen, below 768 px only (P1);
 * from 768 px the page keeps it in the top bar. While it is shown, the content makes room for it and
 * the toasts sit above it.
 */
export function PageActionBar({ children }: { children: ReactNode }) {
  const { target, fill } = use(PageActionSlot);
  const wide = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (wide) return undefined;
    const empty = fill();
    const hide = showActionBar();
    return () => {
      empty();
      hide();
    };
  }, [wide, fill]);

  return wide || target === null ? null : createPortal(children, target);
}
