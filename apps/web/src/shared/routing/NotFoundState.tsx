import { useCopy } from '@shared/copy';
import { EmptyState, SearchXIcon } from '@shared/design-system';
import type { ReactNode } from 'react';
import { StatusPage } from './StatusPage';

/** The page that is not there. Each domain gives its own way on, as `children`. */
export function NotFoundState({ children }: { children: ReactNode }) {
  const copy = useCopy();

  return (
    <StatusPage>
      <EmptyState
        icon={<SearchXIcon />}
        title={copy.status.notFound.title}
        titleAs="h1"
        description={copy.status.notFound.description}
      >
        {children}
      </EmptyState>
    </StatusPage>
  );
}
