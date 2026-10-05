import { use, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageHeaderSlot } from './PageHeaderSlot';

/**
 * The page's title, and what the page adds beside it (`children`), shown in the dashboard's top bar:
 * the shell draws the bar, and the page fills it.
 */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  const slot = use(PageHeaderSlot);

  return slot
    ? createPortal(
        <>
          <h1 className="text-heading-3">{title}</h1>
          {children}
        </>,
        slot,
      )
    : null;
}
