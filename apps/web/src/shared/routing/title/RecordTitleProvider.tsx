import { useMemo, useState, type ReactNode } from 'react';
import type { PageTitle } from './PageTitle';
import { RecordTitleContext } from './RecordTitle';

/**
 * Holds the record's name that a page shows as its title (docs/frontend/architecture.md §2, Titles),
 * once, around every route, so the dashboard's top bar and the document's title read the same one.
 */
export function RecordTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<PageTitle | undefined>(undefined);
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return <RecordTitleContext value={value}>{children}</RecordTitleContext>;
}
