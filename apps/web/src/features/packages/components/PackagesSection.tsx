import { Button, Card, CardContent, EmptyState, Skeleton } from '@shared/design-system';
import { useId } from 'react';
import { usePackagesSection } from '../hooks/list/usePackagesSection';
import type { ShiftChoice } from '../types/ShiftChoice';
import { PackageRow } from './list/PackageRow';
import { PackageSheet } from './sheet/PackageSheet';

/**
 * «الباقات الخاصة», a space's private packages, on its owner's Packages & prices: its title and line,
 * «باقة جديدة» at the end of its row, then one card of the packages, in order, each with its switch
 * and its edit; with its own loading, failed and empty states. The package sheet opens over it. The
 * page hands in the space's shifts (`null` while they load) and the way to its opening hours.
 */
export function PackagesSection({
  spaceId,
  shifts,
  hoursLink,
}: {
  spaceId: number;
  shifts: readonly ShiftChoice[] | null;
  hoursLink: string;
}) {
  const section = usePackagesSection({ spaceId, shifts });
  const titleId = useId();
  const add = (
    <Button type="button" onClick={section.add.run}>
      {section.add.label}
    </Button>
  );

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-heading-3">
            {section.title}
          </h2>
          <p className="text-body-sm text-muted-foreground">{section.description}</p>
        </div>
        {section.status !== 'empty' && add}
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {section.status === 'loading' && (
            <div
              role="status"
              aria-label={section.loadingLabel}
              className="flex flex-col gap-3 p-4"
            >
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}
          {section.status === 'error' && (
            <EmptyState
              title={section.failure.title}
              titleAs="h3"
              description={
                <>
                  {section.failure.message}
                  {section.failure.reference !== undefined && (
                    <span className="block">{section.failure.reference}</span>
                  )}
                </>
              }
            >
              <Button
                variant="outline"
                disabled={section.failure.blocked}
                onClick={section.failure.retry}
              >
                {section.failure.retryLabel}
              </Button>
            </EmptyState>
          )}
          {section.status === 'empty' && (
            <EmptyState
              title={section.empty.title}
              titleAs="h3"
              description={section.empty.description}
            >
              {add}
            </EmptyState>
          )}
          {section.status === 'ready' && (
            <ul className="divide-y divide-border">
              {section.rows.map((row) => (
                <PackageRow key={row.key} row={row} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {section.sheet && (
        <PackageSheet
          spaceId={spaceId}
          editing={section.sheet.editing}
          shifts={shifts}
          hoursLink={hoursLink}
          close={section.sheet.close}
        />
      )}
    </section>
  );
}
