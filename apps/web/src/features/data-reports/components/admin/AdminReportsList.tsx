import type { DataReportField } from '@masaha/shared/data-reports';
import { Badge } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import type { SpaceNameView } from '@shared/lib';
import { ListPagination } from '@shared/lists';
import { useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { useAdminReports } from '../../hooks/admin/useAdminReports';
import type { AdminReportRowView } from '../../types/AdminReportRowView';
import type { AdminSpaceFilterSlot } from '../../types/AdminSpaceFilterSlot';
import { DecideSheet } from '../decide/DecideSheet';
import { OpenReportButton, ReportMessage, ReportsEmpty } from '../ReportListParts';
import { StatusChips } from '../StatusChips';
import { AdminReportFilters } from './AdminReportFilters';
import { FilterTags } from './FilterTags';

const column = createDataTableColumnHelper<AdminReportRowView>();

/** A space's name as a link to its editor, in the name's own language and direction. */
function SpaceLink({ space }: { space: { name: SpaceNameView; link: string } }) {
  return (
    <Link
      to={space.link}
      lang={space.name.lang}
      dir={space.name.dir}
      className="text-label text-foreground underline-offset-4 hover:underline"
    >
      {space.name.text}
    </Link>
  );
}

/**
 * «بلاغات البيانات», the admin's (screen 28): what the list is, the status chips; the space (the
 * page's `spaceFilter`) and the field, in a row from 768 px and in a bottom sheet below it; the
 * filters in force as removable tags at every width with «مسح الفلاتر»; the count; until 1024 px a
 * card per report, from it a table of eight columns — the space (a link to its editor), the field,
 * the report, the reporter, the day, the status, «يعالجه» and «فتح» or «عرض» —; the pages; and the
 * decision sheet, read-only for a verified space's report. Closed, the sheet gives the focus back to
 * the button that opened it, else, its row gone, to the count.
 */
export function AdminReportsList({
  spaceFilter,
  editorLink,
}: {
  spaceFilter: AdminSpaceFilterSlot;
  /** A space's editor, and the section where a field group is edited in it, as the page routes it. */
  editorLink: (spaceId: number, field?: DataReportField) => string;
}) {
  const list = useAdminReports({ editorLink });
  const openerRef = useRef<HTMLElement | null>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const leave = useCallback(() => {
    countRef.current?.focus();
  }, []);
  const { columns: headers } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'space',
          header: headers.space,
          cell: (info) => <SpaceLink space={info.row.original.space} />,
        }),
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
          id: 'reporter',
          header: headers.reporter,
          cell: (info) => <span dir="auto">{info.row.original.reporter}</span>,
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
          id: 'handledBy',
          header: headers.handledBy,
          cell: (info) => (
            <Badge variant={info.row.original.handledBy.tone}>
              {info.row.original.handledBy.label}
            </Badge>
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
        <StatusChips chips={list.chips} />
        <AdminReportFilters filters={list.filters} spaceFilter={spaceFilter} />
        <FilterTags tags={list.tags} clear={list.clear} onEmptied={leave} />
        <p
          ref={countRef}
          tabIndex={-1}
          aria-live="polite"
          className="text-body-sm text-muted-foreground outline-none"
        >
          {list.count}
        </p>
        {list.refreshFailure !== null && (
          <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
        )}
        <DataTable
          label={list.label}
          cardsBelow="lg"
          columns={columns}
          data={list.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SpaceLink space={row.space} />
                <span className="flex flex-wrap items-center gap-1">
                  <Badge variant={row.status.tone}>{row.status.label}</Badge>
                  <Badge variant={row.handledBy.tone}>{row.handledBy.label}</Badge>
                </span>
              </div>
              <span className="text-label">{row.field}</span>
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
          editLink={list.editLinkOf(list.sheet.report)}
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
