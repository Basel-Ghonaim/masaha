import { useCopy } from '@shared/copy';
import { usePageTitle } from '@shared/routing';
import { use, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageHeaderSlot } from './PageHeaderSlot';

/**
 * The page's title, and what the page adds beside it (`children`), shown in the dashboard's top bar:
 * the shell draws the bar, and the page fills it. The title is the one its route says, or the name of
 * the record the page shows, marked with its language when it is not the interface's; the document's
 * title shows it too. A page with none is named by the wordmark, as its tab is, so the heading is
 * never empty. It stays on one line, cut short when it is long, so the bar keeps one height and what
 * a page sticks under it stays in place.
 */
export function PageHeader({ children }: { children?: ReactNode }) {
  const copy = useCopy();
  const slot = use(PageHeaderSlot);
  const title = usePageTitle() ?? { text: copy.site.wordmark };

  return slot
    ? createPortal(
        <>
          <h1 lang={title.lang} dir={title.dir} className="min-w-0 truncate text-heading-3">
            {title.text}
          </h1>
          {children}
        </>,
        slot,
      )
    : null;
}
