import type { ReactNode } from 'react';
import type { AdminSpaceRowView } from '../../types/AdminSpaceRowView';
import { BadgeList } from './BadgeList';
import { SpaceNameText } from './SpaceNameText';

/**
 * A space as a card, on a phone: its name; its area, its owners and its last update on one line;
 * its state and freshness badges, which wrap; and its actions at the end.
 */
export function AdminSpaceCard({ row, actions }: { row: AdminSpaceRowView; actions: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <SpaceNameText name={row.name} />
        <span className="text-caption text-muted-foreground">
          {row.area}
          <span aria-hidden> · </span>
          {row.owners === null ? (
            <>
              <span aria-hidden>{row.ownersLine.shown}</span>
              <span className="sr-only">{row.ownersLine.heard}</span>
            </>
          ) : (
            <span dir="auto">{row.ownersLine.shown}</span>
          )}
          <span aria-hidden> · </span>
          {row.lastUpdated}
        </span>
        <BadgeList badges={[row.state, ...row.freshness]} />
      </div>
      {actions}
    </div>
  );
}
