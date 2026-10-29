import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  FlagIcon,
  Skeleton,
} from '@shared/design-system';
import { ListPagination } from '@shared/lists';
import { Link } from 'react-router';
import { useMyReports, type MyReportsView } from '../../hooks/mine/useMyReports';
import { StatusChips } from '../StatusChips';
import { MyReportCard } from './MyReportCard';

const SKELETONS = [1, 2, 3];

/** What stands in for the cards when there are none: the skeletons, the failure, or an empty state. */
function MineEmpty({ list, browseLink }: { list: MyReportsView; browseLink: string }) {
  if (list.state === 'loading')
    return SKELETONS.map((key) => <Skeleton key={key} className="h-32 w-full rounded-lg" />);
  if (list.state === 'failed') {
    const { failure } = list;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          {failure.message}
          {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
            {failure.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  const { empty } = list;
  return (
    <EmptyState icon={<FlagIcon />} title={empty.title} description={empty.text ?? undefined}>
      {empty.browse !== null && (
        <Button asChild variant="outline">
          <Link to={browseLink}>{empty.browse}</Link>
        </Button>
      )}
    </EmptyState>
  );
}

/**
 * «بلاغاتي» (screen 11): the status chips and the count, then a card per report — its space, its
 * field and day, its status, its message and the reply — in a region marked busy while another page
 * or chip loads; the pages. The page sets the links to the spaces and the directory.
 */
export function MyReportsList({
  spaceLink,
  browseLink,
}: {
  /** The address of a listed space's page. */
  spaceLink: (slug: string) => string;
  /** Where «تصفّح المساحات» leads when none is sent yet. */
  browseLink: string;
}) {
  const list = useMyReports({ spaceLink });

  return (
    <section
      aria-label={list.region}
      aria-busy={list.busy || undefined}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusChips chips={list.chips} />
        <p aria-live="polite" className="text-body-sm text-muted-foreground">
          {list.count}
        </p>
      </div>
      {list.refreshFailure !== null && (
        <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
      )}
      {list.state === 'ready' ? (
        <ul className="flex flex-col gap-4">
          {list.cards.map((card) => (
            <li key={card.key}>
              <MyReportCard card={card} />
            </li>
          ))}
        </ul>
      ) : (
        <MineEmpty list={list} browseLink={browseLink} />
      )}
      {list.pagination !== null && <ListPagination pagination={list.pagination} />}
    </section>
  );
}
