import { useCopy } from '@shared/copy';
import { usePageTitle } from '@shared/routing';
import { use, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageHeaderSlot } from './PageHeaderSlot';

/**
 * The page's title, and what the page adds beside it (`children`), shown in the dashboard's top bar:
 * the shell draws the bar, and the page fills it. The title is the one its route says, which the
 * document's title shows too; a page with none is named by the wordmark, as its tab is, so the
 * heading is never empty.
 */
export function PageHeader({ children }: { children?: ReactNode }) {
  const copy = useCopy();
  const slot = use(PageHeaderSlot);
  const title = usePageTitle() ?? copy.site.wordmark;

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
