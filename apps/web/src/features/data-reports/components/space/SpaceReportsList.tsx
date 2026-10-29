import type { DataReportField } from '@masaha/shared/data-reports';
import { Badge } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useCallback, useMemo, useRef } from 'react';
import { useSpaceReports } from '../../hooks/space/useSpaceReports';
import type { ReportRowView } from '../../types/ReportRowView';
import { DecideSheet } from '../decide/DecideSheet';
import { OpenReportButton, ReportMessage, ReportsEmpty } from '../ReportListParts';
import { StatusChips } from '../StatusChips';

const column = createDataTableColumnHelper<ReportRowView>();

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
          cell: (info) => <ReportMessage row={info.row.original} />,
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
            <OpenReportButton row={info.row.original} openerRef={openerRef} onLeave={leave} />
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
              <ReportMessage row={row} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted-foreground">{row.byline}</span>
                <OpenReportButton row={row} openerRef={openerRef} onLeave={leave} />
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
