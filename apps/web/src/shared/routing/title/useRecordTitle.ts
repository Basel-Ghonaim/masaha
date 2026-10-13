import { use, useLayoutEffect } from 'react';
import type { PageTitle } from './PageTitle';
import { RecordTitleContext } from './RecordTitle';

/**
 * Gives the page's title the name of the record it shows, once it is known: until then (`undefined`)
 * the route's title shows. The name is cleared when the page goes, before the next page paints, so
 * its title never shows the last record's name.
 */
export function useRecordTitle(title: PageTitle | undefined): void {
  const setTitle = use(RecordTitleContext)?.setTitle;
  const text = title?.text;
  const lang = title?.lang;
  const dir = title?.dir;

  useLayoutEffect(() => {
    if (setTitle === undefined) return undefined;
    setTitle(text === undefined ? undefined : { text, lang, dir });
    return () => {
      setTitle(undefined);
    };
  }, [setTitle, text, lang, dir]);
}
