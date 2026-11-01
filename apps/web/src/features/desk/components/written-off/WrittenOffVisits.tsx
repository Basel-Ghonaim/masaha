import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  CardContent,
  CircleCheckIcon,
  EmptyState,
  Refreshing,
  Skeleton,
  WifiOffIcon,
} from '@shared/design-system';
import { ListPagination } from '@shared/lists';
import { Link } from 'react-router';
import {
  useWrittenOffVisits,
  type WrittenOffRowView,
} from '../../hooks/written-off/useWrittenOffVisits';
import { useUndoWriteOff } from '../../hooks/write-off/useUndoWriteOff';
import { toastUndoFailed, toastUndone } from '../toast/deskToasts';

/**
 * One written-off visit: its visitor (their file when a customer's) and day, what was written off
 * and why, by whom and when; «تراجع», sent once and never again by itself (S3, finding 115). Undone,
 * the row leaves: `left` takes the focus on.
 */
function WrittenOffRow({
  spaceId,
  row,
  fileLink,
  left,
}: {
  spaceId: number;
  row: WrittenOffRowView;
  fileLink: (customerId: number) => string;
  left: () => void;
}) {
  const undo = useUndoWriteOff(spaceId, row.visitId);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-2">
          {row.customerId === null ? (
            <span className="text-label" dir="auto">
              {row.name}
            </span>
          ) : (
            <Link
              to={fileLink(row.customerId)}
              dir="auto"
              className="text-label text-foreground underline-offset-4 hover:underline"
            >
              {row.name}
            </Link>
          )}
          <span className="text-caption text-muted-foreground">{row.day}</span>
        </span>
        <span className="text-body-sm">{row.line}</span>
        <span className="text-caption text-muted-foreground">{row.by}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        aria-label={row.undoName}
        disabled={undo.isPending}
        onClick={() => {
          undo.mutate(undefined, {
            onSuccess: () => {
              toastUndone();
              left();
            },
            onError: toastUndoFailed,
          });
        }}
      >
        {row.undo}
      </Button>
    </li>
  );
}

/**
 * «لن تُحصَّل» (164, DI19): the owner's view of the uncollected card — the written-off visits, a page
 * at a time, each with its «تراجع»; its states: loading, failed with a retry, offline (P7), none.
 */
export function WrittenOffVisits({
  spaceId,
  fileLink,
  left,
}: {
  spaceId: number;
  fileLink: (customerId: number) => string;
  left: () => void;
}) {
  const list = useWrittenOffVisits(spaceId);

  return list.state === 'loading' ? (
    <CardContent>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </CardContent>
  ) : list.state === 'offline' ? (
    <CardContent>
      <EmptyState
        icon={<WifiOffIcon />}
        title={list.offline.title}
        titleAs="h3"
        description={list.offline.text}
      >
        <Button variant="outline" onClick={list.failure.retry}>
          {list.failure.retryLabel}
        </Button>
      </EmptyState>
    </CardContent>
  ) : list.state === 'failed' ? (
    <CardContent>
      <Alert variant="destructive">
        <AlertTitle>{list.failure.title}</AlertTitle>
        <AlertDescription>
          {list.failure.message}
          {list.failure.reference !== undefined && (
            <span className="block">{list.failure.reference}</span>
          )}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" disabled={list.failure.blocked} onClick={list.failure.retry}>
            {list.failure.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    </CardContent>
  ) : list.state === 'empty' ? (
    <CardContent>
      <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <CircleCheckIcon aria-hidden className="size-4 text-success" />
        {list.empty}
      </p>
    </CardContent>
  ) : (
    <>
      <Refreshing refreshing={list.busy}>
        <ul aria-busy={list.busy || undefined} className="flex flex-col divide-y">
          {list.rows.map((row) => (
            <WrittenOffRow
              key={row.key}
              spaceId={spaceId}
              row={row}
              fileLink={fileLink}
              left={left}
            />
          ))}
        </ul>
      </Refreshing>
      {list.pagination !== null && (
        <CardContent>
          <ListPagination pagination={list.pagination} />
        </CardContent>
      )}
    </>
  );
}
