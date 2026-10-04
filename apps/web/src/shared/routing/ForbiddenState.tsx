import { useCopy } from '@shared/copy';
import { EmptyState, LockIcon } from '@shared/design-system';
import type { ReactNode } from 'react';
import { StatusPage } from './StatusPage';

/**
 * A signed-in user on a page their account may not open: a clear 403, never a silent redirect
 * (docs/frontend/architecture.md §2). Each domain may give its own way on, as `children`.
 */
export function ForbiddenState({ children }: { children?: ReactNode }) {
  const copy = useCopy();

  return (
    <StatusPage>
      <EmptyState
        icon={<LockIcon />}
        title={copy.status.forbidden.title}
        titleAs="h1"
        description={copy.status.forbidden.description}
      >
        {children}
      </EmptyState>
    </StatusPage>
  );
}
