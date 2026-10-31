import { Button, EmptyState, SearchXIcon } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { ListStateView } from '../types/ListStateView';

/**
 * What stands in for the rows when there are none to show: the failure to load, with its reference
 * and Try again; no rows yet, with the list's way on (`emptyAction`) when it has one; or none
 * matching the filters, with a button that clears them.
 */
export function ListState({ list, emptyAction }: { list: ListStateView; emptyAction?: ReactNode }) {
  if (list.status === 'error') {
    const { failure } = list;
    return (
      <EmptyState
        title={failure.title}
        description={
          <>
            {failure.message}
            {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
          </>
        }
      >
        <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
          {failure.retryLabel}
        </Button>
      </EmptyState>
    );
  }
  if (list.status === 'noMatch') {
    return (
      <EmptyState icon={<SearchXIcon />} title={list.noMatch.title}>
        <Button variant="outline" onClick={list.noMatch.clear}>
          {list.noMatch.clearLabel}
        </Button>
      </EmptyState>
    );
  }
  return (
    <EmptyState title={list.empty.title} description={list.empty.description}>
      {emptyAction}
    </EmptyState>
  );
}
