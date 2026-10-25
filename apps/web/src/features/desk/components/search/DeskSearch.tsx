import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  Input,
  SearchIcon,
  Skeleton,
} from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import { useDeskSearch } from '../../hooks/search/useDeskSearch';
import { CustomerCard } from '../card/CustomerCard';

/**
 * The desk's one search (K1): a region named «البحث», its field controlling the results, which are
 * — once typing pauses — the people present who match (`present.group`, the page's, `occupancy`'s),
 * then the customers the server finds, a card each under their `h2` (DI-38), then the visit's
 * check-in by the typed name (`checkIn`), the primary only when nothing matched, with the no-match
 * line (DI-20, DI-36). The count of results is said politely as it changes (A7). From 768 px the field
 * takes the focus on arrival (S10).
 */
export function DeskSearch({
  spaceId,
  present,
  checkIn,
}: {
  spaceId: number;
  present: {
    /** The customers present now, by id: left out of the cards. */
    customerIds: ReadonlySet<number>;
    /** How many people present a term matches. */
    matches: (term: string) => number;
    /** The people present a term matches, drawn as the first group. */
    group: (term: string) => ReactNode;
  };
  /** Opens the visit's check-in with this name (empty for digits). */
  checkIn: (name: string) => void;
}) {
  const search = useDeskSearch(spaceId, { present });
  const resultsId = useId();
  const customersId = useId();
  const { customers } = search;
  const visitButton =
    search.checkIn === null ? null : (
      <Button
        variant={search.checkIn.primary ? 'primary' : 'outline'}
        onClick={() => {
          if (search.checkIn !== null) checkIn(search.checkIn.name);
        }}
      >
        {search.checkIn.label}
      </Button>
    );

  return (
    <section aria-label={search.region} className="flex flex-col gap-4">
      <Input
        type="search"
        aria-label={search.input.label}
        aria-controls={resultsId}
        placeholder={search.input.placeholder}
        value={search.input.text}
        onChange={(event) => {
          search.input.change(event.target.value);
        }}
        // From 768 px only: on a phone the keyboard would rise over the list (S10).
        autoFocus={search.input.autoFocus}
        startIcon={<SearchIcon />}
      />
      <p aria-live="polite" className="text-body-sm text-muted-foreground empty:hidden">
        {search.count}
      </p>
      <div id={resultsId} className="flex flex-col gap-6">
        {present.group(search.term)}
        {customers.state === 'loading' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        )}
        {customers.state === 'failed' && (
          <Alert variant="destructive">
            <AlertTitle>{customers.failure.title}</AlertTitle>
            <AlertDescription>
              {customers.failure.message}
              {customers.failure.reference !== undefined && (
                <span className="block">{customers.failure.reference}</span>
              )}
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                disabled={customers.failure.blocked}
                onClick={customers.failure.retry}
              >
                {customers.failure.retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {customers.state === 'ready' && customers.rows.length > 0 && (
          <section
            aria-labelledby={customersId}
            aria-busy={customers.busy}
            className="flex flex-col gap-3"
          >
            <h2 id={customersId} className="text-heading-3">
              {customers.heading}
            </h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {customers.rows.map((row) => (
                <li key={row.id}>
                  <CustomerCard row={row} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {search.none !== null ? (
          <EmptyState title={search.none.title} description={search.none.text}>
            {visitButton}
          </EmptyState>
        ) : (
          visitButton !== null && <div>{visitButton}</div>
        )}
      </div>
    </section>
  );
}
