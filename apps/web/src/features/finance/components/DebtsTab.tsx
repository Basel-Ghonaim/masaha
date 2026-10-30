import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CircleCheckIcon,
  EmptyState,
  Skeleton,
  StatCard,
} from '@shared/design-system';
import { ListPagination } from '@shared/lists';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useDebtsTab } from '../hooks/debts/useDebtsTab';
import type { FinanceTabsView } from '../hooks/useFinanceTabs';
import type { FinanceLinks } from '../types/FinanceLinks';
import { DebtorRow } from './DebtorRow';
import { LoadFailure } from './LoadFailure';

/** A card of the tab: its title an `h2`, its description, an action, and its content. */
function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{title}</h2>
        </CardTitle>
        {description !== undefined && <CardDescription>{description}</CardDescription>}
        {action !== undefined && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

/**
 * Finance › Debts (D5.4): the four tiles, who owes, who is in credit and who paid in the month.
 * While it loads, blocks in their places; a failure, its retry.
 */
export function DebtsTab({
  spaceId,
  place,
  links,
  spaceName,
}: {
  spaceId: number;
  place: Pick<FinanceTabsView, 'month' | 'asked' | 'owesPage' | 'creditPage' | 'searchOf'>;
  links: FinanceLinks;
  spaceName: string;
}) {
  const debts = useDebtsTab(spaceId, place, { links, spaceName });

  if (debts.state === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((block) => (
            <Skeleton key={block} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (debts.state === 'failed') {
    return <LoadFailure failure={debts.failure} />;
  }
  const { owes, credit, payers } = debts;
  return (
    <div className="flex flex-col gap-4" aria-busy={debts.busy || undefined}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {debts.tiles.map((tile) => {
          const card = (
            <StatCard
              label={tile.label}
              value={<span dir="ltr">{tile.value}</span>}
              helper={tile.helper}
              className={tile.href === null ? 'h-full' : 'h-full hover:bg-accent'}
            />
          );
          return tile.href === null ? (
            <div key={tile.key}>{card}</div>
          ) : (
            <Link
              key={tile.key}
              to={tile.href}
              className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {card}
            </Link>
          );
        })}
      </div>
      <Section title={owes.title} description={owes.description}>
        {owes.rows.length === 0 ? (
          <EmptyState icon={<CircleCheckIcon />} title={owes.empty} titleAs="h3" />
        ) : (
          <>
            {owes.range !== null && (
              <p className="text-caption text-muted-foreground">{owes.range}</p>
            )}
            <ul className="flex flex-col divide-y">
              {owes.rows.map((debtor) => (
                <DebtorRow key={debtor.key} debtor={debtor} />
              ))}
            </ul>
            {owes.pagination !== null && <ListPagination pagination={owes.pagination} />}
          </>
        )}
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={credit.title} description={credit.description}>
          {credit.rows.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{credit.none}</p>
          ) : (
            <>
              <ul className="flex flex-col divide-y">
                {credit.rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Link
                      to={row.href}
                      className="text-label underline-offset-4 hover:underline"
                      dir="auto"
                    >
                      {row.name}
                    </Link>
                    <Badge variant="success">{row.amount}</Badge>
                  </li>
                ))}
              </ul>
              {credit.pagination !== null && <ListPagination pagination={credit.pagination} />}
            </>
          )}
        </Section>
        <Section
          title={payers.title}
          action={
            payers.viewAll === null ? undefined : (
              <Button asChild variant="link" size="sm">
                <Link to={payers.viewAll.href}>{payers.viewAll.label}</Link>
              </Button>
            )
          }
        >
          {payers.rows.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{payers.none}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {payers.rows.map((row) => (
                <li key={row.key} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <Link
                    to={row.href}
                    className="self-start text-label underline-offset-4 hover:underline"
                    dir="auto"
                  >
                    {row.name}
                  </Link>
                  <span className="text-caption text-muted-foreground">{row.line}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
