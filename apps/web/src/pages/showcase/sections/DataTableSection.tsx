import {
  Badge,
  Button,
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  DataTable,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisIcon,
  EmptyState,
  EyeIcon,
  Input,
  LogInIcon,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationSummary,
  SearchIcon,
  SearchXIcon,
  Tabs,
  TabsList,
  TabsTrigger,
  createDataTableColumnHelper,
  Calendar,
  type BadgeProps,
  type DateRange,
} from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';
import {
  MemberAvatar,
  MemberCell,
  statusVariant,
  type Member,
  type MembersSamples,
} from './members';

type Report = {
  title: string;
  field: string;
  space: string;
  area: string;
  reporter: string;
  date: string;
  status: string;
};

type DataTableSamples = {
  title: string;
  membersCaption: string;
  loadingCaption: string;
  emptyCaption: string;
  reportsCaption: string;
  search: string;
  tabsLabel: string;
  tabs: string[];
  checkIn: string;
  actions: string;
  view: string;
  edit: string;
  endsPrefix: string;
  summary: string;
  reports: {
    label: string;
    search: string;
    status: string;
    area: string;
    type: string;
    period: string;
    periodPanel: string;
    types: ListSamples;
    menu: string[];
    columns: { report: string; space: string; reporter: string; date: string; status: string };
    fieldPrefix: string;
    rows: Report[];
    summary: string;
  };
};

type PaginationSamples = {
  label: string;
  previous: string;
  next: string;
  more: string;
  summary: string;
};

type ListSamples = {
  search: string;
  searchPlaceholder: string;
  list: string;
  empty: string;
  options: string[];
};

type Samples = {
  samples: DataTableSamples;
  members: MembersSamples;
  pagination: PaginationSamples;
  emptyState: { search: { title: string; description: string; clear: string } };
  lists: { areas: ListSamples; statuses: ListSamples };
  calendar: { previous: string; next: string };
  lang: 'ar' | 'en';
};

// A row keeps its fixture position, which picks its status colour: fixtures hold phrases only.
type MemberRow = Member & { index: number };
type ReportRow = Report & { index: number };

// The stress test's period: the 30 days up to 28 September 2026.
const PERIOD: DateRange = { from: new Date(2026, 7, 30), to: new Date(2026, 8, 28) };

const REPORT_VARIANTS: NonNullable<BadgeProps['variant']>[] = ['info', 'warning', 'success'];

// dd/mm/yyyy as yyyy-mm-dd, so the dates sort in time order.
function sortableDate(date: string) {
  return date.split('/').reverse().join('-');
}

function MembersPagination({ samples }: { samples: PaginationSamples }) {
  return (
    <Pagination label={samples.label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" disabled>
            {samples.previous}
          </PaginationPrevious>
        </PaginationItem>
        {[1, 2, 3].map((page) => (
          <PaginationItem key={page}>
            <PaginationLink href="#" isActive={page === 1}>
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis label={samples.more} />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">5</PaginationLink>
        </PaginationItem>
        <PaginationSummary>
          {samples.summary.replace('{page}', '1').replace('{total}', '5')}
        </PaginationSummary>
        <PaginationItem>
          <PaginationNext href="#">{samples.next}</PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function RowActions({ name, label, items }: { name: string; label: string; items: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`${label} ${name}`}>
          <EllipsisIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item, index) => (
          <DropdownMenuItem key={item}>
            {index === 0 && <EyeIcon aria-hidden />}
            {item}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CheckIn({ member, label }: { member: MemberRow; label: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full md:w-auto"
      disabled={statusVariant(member.index) === 'destructive'}
    >
      <LogInIcon aria-hidden />
      {label}
    </Button>
  );
}

function MembersToolbar({ samples }: { samples: DataTableSamples }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        aria-label={samples.search}
        placeholder={samples.search}
        startIcon={<SearchIcon />}
        className="md:max-w-80"
      />
      <Tabs defaultValue="0">
        <TabsList aria-label={samples.tabsLabel}>
          {samples.tabs.map((tab, index) => (
            <TabsTrigger key={tab} value={String(index)}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

const memberColumns = createDataTableColumnHelper<MemberRow>();
const reportColumns = createDataTableColumnHelper<ReportRow>();

export function DataTableSection({
  samples,
  members,
  pagination,
  emptyState,
  lists,
  calendar,
  lang,
}: Samples) {
  const [period, setPeriod] = useState<DateRange | undefined>(PERIOD);
  const rows: MemberRow[] = members.rows.map((member, index) => ({ ...member, index }));
  const { columns } = members;

  const membersTable = memberColumns.columns([
    memberColumns.accessor('name', {
      header: columns.member,
      enableSorting: true,
      cell: (info) => <MemberCell member={info.row.original} />,
    }),
    memberColumns.accessor('plan', { header: columns.membership }),
    memberColumns.accessor((member) => sortableDate(member.ends), {
      id: 'ends',
      header: columns.ends,
      enableSorting: true,
      cell: (info) => <span dir="ltr">{info.row.original.ends}</span>,
    }),
    memberColumns.display({
      id: 'status',
      header: columns.status,
      cell: (info) => (
        <Badge variant={statusVariant(info.row.original.index)}>{info.row.original.status}</Badge>
      ),
    }),
    memberColumns.display({
      id: 'attendance',
      header: columns.attendance,
      cell: (info) => <CheckIn member={info.row.original} label={samples.checkIn} />,
    }),
    memberColumns.display({
      id: 'actions',
      cell: (info) => (
        <RowActions
          name={info.row.original.name}
          label={samples.actions}
          items={[samples.view, samples.edit]}
        />
      ),
      meta: { className: 'w-px' },
    }),
  ]);

  const renderMember = (member: MemberRow) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <MemberAvatar member={member} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm">{member.name}</span>
          <span className="text-caption text-muted-foreground">
            {member.plan} · {samples.endsPrefix} <span dir="ltr">{member.ends}</span>
          </span>
        </div>
        <Badge variant={statusVariant(member.index)}>{member.status}</Badge>
      </div>
      <CheckIn member={member} label={samples.checkIn} />
    </div>
  );

  const { reports } = samples;
  const reportRows: ReportRow[] = reports.rows.map((report, index) => ({ ...report, index }));
  const reportsTable = reportColumns.columns([
    reportColumns.accessor('title', {
      header: reports.columns.report,
      cell: (info) => (
        <div className="flex flex-col">
          <span>{info.row.original.title}</span>
          <span className="text-caption text-muted-foreground">
            {reports.fieldPrefix} {info.row.original.field}
          </span>
        </div>
      ),
    }),
    reportColumns.accessor('space', {
      header: reports.columns.space,
      cell: (info) => (
        <div className="flex flex-col">
          <span>{info.row.original.space}</span>
          <span className="text-caption text-muted-foreground">{info.row.original.area}</span>
        </div>
      ),
    }),
    reportColumns.accessor('reporter', { header: reports.columns.reporter }),
    reportColumns.accessor((report) => sortableDate(report.date), {
      id: 'date',
      header: reports.columns.date,
      enableSorting: true,
      cell: (info) => <span dir="ltr">{info.row.original.date}</span>,
    }),
    reportColumns.display({
      id: 'status',
      header: reports.columns.status,
      cell: (info) => (
        <Badge variant={REPORT_VARIANTS[info.row.original.index] ?? 'neutral'}>
          {info.row.original.status}
        </Badge>
      ),
    }),
    reportColumns.display({
      id: 'actions',
      cell: (info) => (
        <RowActions name={info.row.original.title} label={samples.actions} items={reports.menu} />
      ),
      meta: { className: 'w-px' },
    }),
  ]);

  const renderReport = (report: ReportRow) => (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Badge variant={REPORT_VARIANTS[report.index] ?? 'neutral'}>{report.status}</Badge>
        <span className="text-body-sm">{report.title}</span>
        <span className="text-caption text-muted-foreground">
          <span dir="ltr">{report.date}</span> · {report.field} · {report.space}
        </span>
      </div>
      <RowActions name={report.title} label={samples.actions} items={reports.menu} />
    </div>
  );

  const filterRow = (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        aria-label={reports.search}
        placeholder={reports.search}
        startIcon={<SearchIcon />}
        className="w-full md:w-64"
      />
      <Combobox type="multiple" defaultValue={['0', '1']}>
        <ComboboxTrigger className="w-auto">{reports.status}</ComboboxTrigger>
        <ComboboxContent
          searchLabel={lists.statuses.search}
          searchPlaceholder={lists.statuses.searchPlaceholder}
          listLabel={lists.statuses.list}
          emptyText={lists.statuses.empty}
        >
          {lists.statuses.options.map((option, index) => (
            <ComboboxItem key={option} value={String(index)}>
              {option}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
      <Combobox type="single">
        <ComboboxTrigger className="w-auto">{reports.area}</ComboboxTrigger>
        <ComboboxContent
          searchLabel={lists.areas.search}
          searchPlaceholder={lists.areas.searchPlaceholder}
          listLabel={lists.areas.list}
          emptyText={lists.areas.empty}
        >
          {lists.areas.options.map((option, index) => (
            <ComboboxItem key={option} value={String(index)}>
              {option}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
      <Combobox type="single">
        <ComboboxTrigger className="w-auto">{reports.type}</ComboboxTrigger>
        <ComboboxContent
          searchLabel={reports.types.search}
          searchPlaceholder={reports.types.searchPlaceholder}
          listLabel={reports.types.list}
          emptyText={reports.types.empty}
        >
          {reports.types.options.map((option, index) => (
            <ComboboxItem key={option} value={String(index)}>
              {option}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
      <DatePicker>
        <DatePickerTrigger className="w-auto">{reports.period}</DatePickerTrigger>
        <DatePickerContent label={reports.periodPanel}>
          <Calendar
            lang={lang}
            mode="range"
            defaultMonth={PERIOD.from}
            selected={period}
            onSelect={setPeriod}
            previousMonthLabel={calendar.previous}
            nextMonthLabel={calendar.next}
          />
        </DatePickerContent>
      </DatePicker>
    </div>
  );

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.membersCaption}>
        <DataTable
          label={members.label}
          columns={membersTable}
          data={rows}
          getRowId={(member) => member.phone}
          renderCard={renderMember}
          empty={null}
          toolbar={<MembersToolbar samples={samples} />}
          summary={samples.summary}
          pagination={<MembersPagination samples={pagination} />}
          className="w-full"
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.loadingCaption}>
        <DataTable
          label={members.label}
          columns={membersTable}
          data={rows}
          renderCard={renderMember}
          empty={null}
          loading
          loadingRows={3}
          className="w-full"
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.emptyCaption}>
        <DataTable
          label={members.label}
          columns={membersTable}
          data={[]}
          renderCard={renderMember}
          empty={
            <EmptyState
              icon={<SearchXIcon />}
              title={emptyState.search.title}
              description={emptyState.search.description}
              titleAs="h3"
            >
              <Button variant="outline">{emptyState.search.clear}</Button>
            </EmptyState>
          }
          className="w-full"
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.reportsCaption}>
        <DataTable
          label={reports.label}
          columns={reportsTable}
          data={reportRows}
          getRowId={(report) => report.title}
          renderCard={renderReport}
          empty={null}
          toolbar={filterRow}
          summary={reports.summary}
          pagination={<MembersPagination samples={pagination} />}
          className="w-full"
        />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
