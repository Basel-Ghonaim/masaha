import { useCopy } from '@shared/copy';
import { useMatches } from 'react-router';
import { isTitled } from './titledHandle';

/**
 * The title of the page shown, in the interface's language: the deepest matching route's that has
 * one, or nothing. The dashboard's top bar and the document's title both read it, so they never
 * disagree.
 */
export function usePageTitle(): string | undefined {
  const copy = useCopy();
  const handle = useMatches()
    .map((match) => match.handle)
    .findLast(isTitled);
  return handle?.title(copy);
}
