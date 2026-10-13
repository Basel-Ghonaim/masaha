import { useCopy } from '@shared/copy';
import { useEffect } from 'react';
import { usePageTitle } from './usePageTitle';

/**
 * Sets the document's title, the one place that does (WCAG 2.4.2): the page's title and the site's
 * name, or the name alone on a page without one. It follows the language, every navigation, and the
 * name of the record a page shows.
 */
export function DocumentTitle() {
  const copy = useCopy();
  const page = usePageTitle();
  const title =
    page === undefined ? copy.site.wordmark : copy.site.documentTitle({ page: page.text });

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
