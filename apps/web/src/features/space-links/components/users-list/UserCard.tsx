import { Badge } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { UserRowView } from '../../types/UserRowView';

/**
 * A person as a card, below 1024 px: their name and email, then their role, how they sign in and
 * when they joined on one line, their state and their actions (or «أنت») at the end, and their
 * spaces and front desks under them.
 */
export function UserCard({
  row,
  line,
  actions,
  spaces,
}: {
  row: UserRowView;
  /** The role, the sign-in and the joining date, on one line. */
  line: string;
  /** The row's actions, or «أنت» on the admin's own row. */
  actions: ReactNode;
  spaces: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-label">
            <span dir="auto">{row.name}</span>
          </span>
          <span className="text-caption text-muted-foreground">
            <span dir="ltr">{row.email}</span>
          </span>
          <span className="text-caption text-muted-foreground">{line}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={row.state.variant}>{row.state.label}</Badge>
          {actions}
        </div>
      </div>
      {spaces}
    </div>
  );
}
