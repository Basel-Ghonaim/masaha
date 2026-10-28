import type { DataReportField } from '@masaha/shared/data-reports';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  FlagIcon,
} from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useSpaceReports, type SpaceReportsView } from '../../hooks/space/useSpaceReports';
import type { ReportRowView } from '../../types/ReportRowView';
import { DecideSheet } from '../decide/DecideSheet';
import { StatusChips } from '../StatusChips';

const column = createDataTableColumnHelper<ReportRowView>();

/** A report's message, two lines at most in a row, in its own direction; none said muted. */
function Message({ row }: { row: ReportRowView }) {
  return (
    <p
      dir="auto"
      className={
        row.message.none
          ? 'text-body-sm text-muted-foreground'
          : 'line-clamp-2 text-body-sm break-words'
      }
    >
      {row.message.text}
    </p>
  );
}

/** What stands in for the rows when there are none: the failure with its retry, or the empty states. */
function ReportsEmpty({ list }: { list: SpaceReportsView }) {
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
      {empty.showAll !== null && (
        <Button variant="outline" onClick={empty.showAll.run}>
          {empty.showAll.label}
        </Button>
      )}
    </EmptyState>
  );
}

/**
 * «بلاغات البيانات», the owner's (screen 23): what the list is, the status chips and the count; from
 * 768 px a table of five columns — the field, the report (two lines), the day, the status and «فتح» —
 * and a card each below it; the pages; and the decision sheet of the report opened, whose «تعديل
 * الحقل» leads where `fieldLink` says. The reporter is never named (O12). Closed, the sheet gives the
 * focus back to the «فتح» that opened it, else, its row gone, to the count.
 */
export function SpaceReportsList({
  spaceId,
  fieldLink,
}: {
  spaceId: number;
  /** Where a field group is edited, as the page routes it. */
  fieldLink: (field: DataReportField) => string;
}) {
  const list = useSpaceReports(spaceId);
  // The «فتح» that opened the sheet, and the count, where the focus goes when that row has left.
  const openerRef = useRef<HTMLElement | null>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  // A «فتح» that leaves while it holds the focus — its report decided and gone from the chip shown —
  // hands the focus to the count, rather than to the page's body.
  const leave = useCallback(() => {
    countRef.current?.focus();
  }, []);
  const { columns: headers } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'field',
          header: headers.field,
          cell: (info) => <span className="text-label">{info.row.original.field}</span>,
        }),
        column.display({
          id: 'report',
          header: headers.report,
          cell: (info) => <Message row={info.row.original} />,
        }),
        column.display({
          id: 'date',
          header: headers.date,
          cell: (info) => <span className="whitespace-nowrap">{info.row.original.day}</span>,
        }),
        column.display({
          id: 'status',
          header: headers.status,
          cell: (info) => (
            <Badge variant={info.row.original.status.tone}>{info.row.original.status.label}</Badge>
          ),
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">{headers.actions}</span>,
          cell: (info) => (
            <OpenButton row={info.row.original} openerRef={openerRef} onLeave={leave} />
          ),
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, leave],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">{list.intro}</p>
      <section
        aria-label={list.label}
        aria-busy={list.busy || undefined}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusChips chips={list.chips} />
          <p
            ref={countRef}
            tabIndex={-1}
            aria-live="polite"
            className="text-body-sm text-muted-foreground outline-none"
          >
            {list.count}
          </p>
        </div>
        {list.refreshFailure !== null && (
          <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
        )}
        <DataTable
          label={list.label}
          columns={columns}
          data={list.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-label">{row.field}</span>
                <Badge variant={row.status.tone}>{row.status.label}</Badge>
              </div>
              <Message row={row} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted-foreground">{row.byline}</span>
                <OpenButton row={row} openerRef={openerRef} onLeave={leave} />
              </div>
            </div>
          )}
          loading={list.state === 'loading'}
          empty={<ReportsEmpty list={list} />}
          pagination={list.pagination !== null && <ListPagination pagination={list.pagination} />}
        />
      </section>
      {list.sheet !== null && (
        <DecideSheet
          // Another report is another sheet: nothing typed for one carries over.
          key={list.sheet.report.id}
          target={list.sheet}
          editLink={fieldLink(list.sheet.report.field)}
          showDecided={list.showDecided}
          onClose={list.close}
          returnFocus={() =>
            openerRef.current?.isConnected === true ? openerRef.current : countRef.current
          }
        />
      )}
    </div>
  );
}

/**
 * «فتح»: opens the row's report in the sheet, keeping itself as where the focus returns; when it
 * leaves holding the focus, `onLeave` places it (a layout effect's cleanup runs before the browser
 * drops the focus).
 */
function OpenButton({
  row,
  openerRef,
  onLeave,
}: {
  row: ReportRowView;
  openerRef: RefObject<HTMLElement | null>;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const button = ref.current;
    return () => {
      if (button !== null && button.ownerDocument.activeElement === button) onLeave();
    };
  }, [onLeave]);

  return (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      onClick={(event) => {
        openerRef.current = event.currentTarget;
        row.open.run();
      }}
    >
      {row.open.label}
    </Button>
  );
}
