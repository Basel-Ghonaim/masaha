import type { PresentPerson } from '@masaha/shared/occupancy';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
} from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { usePresentList } from '../hooks/now/usePresentList';
import type { PresentRowView } from '../types/PresentRowView';

const column = createDataTableColumnHelper<PresentRowView>();

// The stays are said to the minute.
const TICK_MS = 60_000;

/**
 * «الحاضرون الآن»: a section named by its heading, with the count present (and the capacity), then
 * the people present in the server's order — a table from 768 px, a card each below it — with their
 * kind, since when and for how long, a visit's charge so far, and the row's action the page sets
 * (`action`), such as the desk's check-out. The list is read on arrival, every 30 s while visible
 * and on returning to it; a failed refresh keeps the last list and says so. When the person whose
 * action had the focus leaves the list, the focus goes to the next row's action, else to the
 * heading (S10), never to the page's start.
 */
export function PresentList({
  spaceId,
  action,
}: {
  spaceId: number;
  action: (person: PresentPerson) => ReactNode;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);
  const list = usePresentList(spaceId, { now });
  const headingId = useId();
  const section = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  // The row whose action last had the focus, and its place in the list.
  const focused = useRef<{ key: string; index: number } | null>(null);
  const keys = list.rows.map((row) => row.key);
  const keysKey = keys.join(' ');
  const remember = (event: FocusEvent<HTMLElement>) => {
    const holder = event.target.closest<HTMLElement>('[data-present-action]');
    const key = holder?.dataset.presentAction;
    focused.current = key === undefined ? null : { key, index: keys.indexOf(key) };
  };
  useEffect(() => {
    const last = focused.current;
    const rows = keysKey === '' ? [] : keysKey.split(' ');
    if (last === null || rows.includes(last.key)) return;
    focused.current = null;
    // Only a focus the row took with it: one the user moved elsewhere stays there.
    if (document.activeElement !== document.body) return;
    const next = rows[Math.min(last.index, rows.length - 1)];
    const target =
      next === undefined
        ? null
        : section.current?.querySelector<HTMLElement>(
            `[data-present-action="${next}"] button:not([disabled])`,
          );
    (target ?? heading.current)?.focus();
  }, [keysKey]);

  const { columns: headers } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => (
            <span className="text-label" dir="auto">
              {info.row.original.name}
            </span>
          ),
        }),
        column.display({
          id: 'kind',
          header: headers.kind,
          cell: (info) => <Badge variant="neutral">{info.row.original.kind}</Badge>,
        }),
        column.display({
          id: 'since',
          header: headers.since,
          cell: (info) => info.row.original.since,
        }),
        column.display({
          id: 'duration',
          header: headers.duration,
          cell: (info) => info.row.original.duration,
        }),
        column.display({
          id: 'detail',
          header: headers.detail,
          cell: (info) => info.row.original.detail,
          meta: { className: 'hidden lg:table-cell' },
        }),
        column.display({
          id: 'actions',
          header: headers.actions,
          cell: (info) => (
            <div data-present-action={info.row.original.key}>
              {action(info.row.original.person)}
            </div>
          ),
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, action],
  );

  return (
    <section
      ref={section}
      aria-labelledby={headingId}
      onFocus={remember}
      className="flex flex-col gap-3"
    >
      <h2
        ref={heading}
        id={headingId}
        tabIndex={-1}
        className="flex items-baseline gap-2 text-heading-3"
      >
        {list.heading.title}
        {list.heading.count !== null && (
          <>
            {' '}
            <span dir="ltr">{list.heading.count}</span>
          </>
        )}
      </h2>
      {list.refreshFailure !== null && (
        <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
      )}
      {list.state === 'failed' ? (
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
      ) : (
        <DataTable
          label={list.label}
          columns={columns}
          data={list.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label" dir="auto">
                    {row.name}
                  </span>
                  <Badge variant="neutral">{row.kind}</Badge>
                </div>
                <span className="text-caption text-muted-foreground">
                  {row.since} · {row.duration}
                </span>
                {row.detail !== null && (
                  <span className="text-caption text-muted-foreground">{row.detail}</span>
                )}
              </div>
              <div data-present-action={row.key}>{action(row.person)}</div>
            </div>
          )}
          loading={list.state === 'loading'}
          loadingRows={3}
          empty={<EmptyState title={list.empty.title} description={list.empty.text} />}
          summary={list.state === 'ready' ? list.summary : undefined}
        />
      )}
    </section>
  );
}
