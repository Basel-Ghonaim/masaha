import { useCopy } from '@shared/copy';
import { use } from 'react';
import { useMatches } from 'react-router';
import type { PageTitle } from './PageTitle';
import { RecordTitleContext } from './RecordTitle';
import { isTitled } from './titledHandle';

/**
 * The title of the page shown, in the interface's language: the name of the record the page shows,
 * once it has given one (`useRecordTitle`), else the deepest matching route's title, or nothing. The
 * dashboard's top bar and the document's title both read it, so they never disagree.
 */
export function usePageTitle(): PageTitle | undefined {
  const copy = useCopy();
  const record = use(RecordTitleContext)?.title;
  const handle = useMatches()
    .map((match) => match.handle)
    .findLast(isTitled);
  if (record !== undefined) return record;
  return handle === undefined ? undefined : { text: handle.title(copy) };
}
