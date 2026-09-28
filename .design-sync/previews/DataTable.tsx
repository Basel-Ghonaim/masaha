import './_document';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Calendar,
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
  type BadgeProps,
  type DateRange,
} from '@masaha/design-system';

// Ported from the showcase's DataTableSection
// (apps/web/src/pages/showcase/sections/DataTableSection.tsx) and its members helpers
// (sections/members.tsx): the Owner › Members and Admin › Data reports stress tests.

type Member = { name: string; phone: string; plan: string; ends: string; status: string };
type MemberRow = Member & { index: number };

const MEMBERS: Member[] = [
  {
    name: 'سارة الحلو',
    phone: '+970 59 234 1188',
    plan: 'شهرية',
    ends: '28/09/2026',
    status: 'ينتهي خلال يومين',
  },
  {
    name: 'محمد أبو شعبان',
    phone: '+970 56 771 0932',
    plan: 'أسبوعية',
    ends: '29/09/2026',
    status: 'ينتهي خلال 3 أيام',
  },
  {
    name: 'نور الهدى عبد الرحمن الخالدي',
    phone: '+970 59 610 2284',
    plan: 'فصلية',
    ends: '30/11/2026',
    status: 'نشط',
  },
  { name: 'ليان عوض', phone: '+970 59 818 4471', plan: 'شهرية', ends: '14/10/2026', status: 'نشط' },
  {
    name: 'هبة قاسم',
    phone: '+970 59 440 2210',
    plan: 'أسبوعية',
    ends: '24/09/2026',
    status: 'منتهية',
  },
  {
    name: 'يوسف النجار',
    phone: '+970 56 302 7765',
    plan: 'شهرية',
    ends: '21/10/2026',
    status: 'نشط',
  },
  {
    name: 'عمر الشوا',
    phone: '+970 59 127 5530',
    plan: 'شهرية',
    ends: '05/10/2026',
    status: 'نشط',
  },
  {
    name: 'أحمد صيام',
    phone: '+970 56 948 0016',
    plan: 'أسبوعية',
    ends: '19/09/2026',
    status: 'منتهية',
  },
];

const ROWS: MemberRow[] = MEMBERS.map((member, index) => ({ ...member, index }));

// The first five rows (one of each status) keep the whole frame, footer included, inside the
// card's 700px viewport; all eight push the pagination footer out of the capture.
const PAGE: MemberRow[] = ROWS.slice(0, 5);

// Each row's status colour, by position.
const STATUS_VARIANTS: NonNullable<BadgeProps['variant']>[] = [
  'warning',
  'warning',
  'success',
  'success',
  'destructive',
  'success',
  'success',
  'destructive',
];

function statusVariant(index: number) {
  return STATUS_VARIANTS[index % STATUS_VARIANTS.length] ?? 'neutral';
}

// The first letters of the first and last names, without the article, spaced so they do not join.
function initials(name: string) {
  const words = name.split(' ');
  return [words[0], words.at(-1)].map((word) => word?.replace(/^ال/, '').charAt(0) ?? '').join(' ');
}

function MemberAvatar({ member }: { member: Member }) {
  return (
    <Avatar aria-hidden>
      <AvatarFallback>{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}

function MemberCell({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3">
      <MemberAvatar member={member} />
      <div className="flex flex-col">
        <span className="text-body-sm text-foreground">{member.name}</span>
        <span dir="ltr" className="self-start text-caption whitespace-nowrap text-muted-foreground">
          {member.phone}
        </span>
      </div>
    </div>
  );
}

// dd/mm/yyyy as yyyy-mm-dd, so the dates sort in time order.
function sortableDate(date: string) {
  return date.split('/').reverse().join('-');
}

function MembersPagination() {
  return (
    <Pagination label="صفحات قائمة المشتركين">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" disabled>
            السابقة
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
          <PaginationEllipsis label="أرقام صفحات محذوفة" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">5</PaginationLink>
        </PaginationItem>
        <PaginationSummary>صفحة 1 من 5</PaginationSummary>
        <PaginationItem>
          <PaginationNext href="#">التالية</PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function RowActions({ name, items }: { name: string; items: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`إجراءات ${name}`}>
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

function CheckIn({ member }: { member: MemberRow }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full md:w-auto"
      disabled={statusVariant(member.index) === 'destructive'}
    >
      <LogInIcon aria-hidden />
      تسجيل حضور
    </Button>
  );
}

function MembersToolbar() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        aria-label="ابحث بالاسم أو رقم الهاتف"
        placeholder="ابحث بالاسم أو رقم الهاتف"
        startIcon={<SearchIcon />}
        className="md:max-w-80"
      />
      <Tabs defaultValue="0">
        <TabsList aria-label="فلترة المشتركين حسب الحالة">
          {['الكل 38', 'نشط 31', 'ينتهي قريباً 5', 'منتهية 2'].map((tab, index) => (
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

const MEMBER_COLUMNS = memberColumns.columns([
  memberColumns.accessor('name', {
    header: 'المشترك',
    enableSorting: true,
    cell: (info) => <MemberCell member={info.row.original} />,
  }),
  memberColumns.accessor('plan', { header: 'العضوية' }),
  memberColumns.accessor((member) => sortableDate(member.ends), {
    id: 'ends',
    header: 'تنتهي في',
    enableSorting: true,
    cell: (info) => <span dir="ltr">{info.row.original.ends}</span>,
  }),
  memberColumns.display({
    id: 'status',
    header: 'الحالة',
    cell: (info) => (
      <Badge variant={statusVariant(info.row.original.index)}>{info.row.original.status}</Badge>
    ),
  }),
  memberColumns.display({
    id: 'attendance',
    header: 'الحضور',
    cell: (info) => <CheckIn member={info.row.original} />,
  }),
  memberColumns.display({
    id: 'actions',
    cell: (info) => (
      <RowActions name={info.row.original.name} items={['عرض تفاصيل المشترك', 'تعديل العضوية']} />
    ),
    meta: { className: 'w-px' },
  }),
]);

// A row as a card, below 768px.
function renderMember(member: MemberRow) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <MemberAvatar member={member} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm">{member.name}</span>
          <span className="text-caption text-muted-foreground">
            {member.plan} · تنتهي <span dir="ltr">{member.ends}</span>
          </span>
        </div>
        <Badge variant={statusVariant(member.index)}>{member.status}</Badge>
      </div>
      <CheckIn member={member} />
    </div>
  );
}

/** Owner › Members: sortable name and end date, a toolbar, and the pagination footer. */
export function Members() {
  return (
    <DataTable
      label="مشتركو مساحة الريادة"
      columns={MEMBER_COLUMNS}
      data={PAGE}
      getRowId={(member) => member.phone}
      renderCard={renderMember}
      empty={null}
      toolbar={<MembersToolbar />}
      summary="عرض 1–5 من 38"
      pagination={<MembersPagination />}
      className="w-full"
    />
  );
}

/** Loading: placeholder rows stand in for the rows. */
export function Loading() {
  return (
    <DataTable
      label="مشتركو مساحة الريادة"
      columns={MEMBER_COLUMNS}
      data={ROWS}
      renderCard={renderMember}
      empty={null}
      loading
      loadingRows={3}
      className="w-full"
    />
  );
}

/** No rows: the EmptyState takes their place. */
export function Empty() {
  return (
    <DataTable
      label="مشتركو مساحة الريادة"
      columns={MEMBER_COLUMNS}
      data={[]}
      renderCard={renderMember}
      empty={
        <EmptyState
          icon={<SearchXIcon />}
          title="لا يوجد مشترك باسم «خالد»"
          description="تحقّق من كتابة الاسم، أو ابحث برقم الهاتف."
          titleAs="h3"
        >
          <Button variant="outline">مسح البحث</Button>
        </EmptyState>
      }
      className="w-full"
    />
  );
}

type Report = {
  title: string;
  field: string;
  space: string;
  area: string;
  reporter: string;
  date: string;
  status: string;
};
type ReportRow = Report & { index: number };

const REPORTS: ReportRow[] = [
  {
    title: 'سعر اليوم الكامل غير صحيح',
    field: 'الأسعار',
    space: 'مساحة الريادة',
    area: 'الرمال',
    reporter: 'رامي خليل',
    date: '26/09/2026',
    status: 'جديد',
  },
  {
    title: 'ساعات يوم الجمعة تغيّرت',
    field: 'ساعات العمل',
    space: 'بيت العمل',
    area: 'تل الهوا',
    reporter: 'منى سالم',
    date: '25/09/2026',
    status: 'قيد المراجعة',
  },
  {
    title: 'الموقع على الخريطة غير دقيق',
    field: 'الموقع',
    space: 'بيت العمل',
    area: 'تل الهوا',
    reporter: 'دعاء فروانة',
    date: '18/09/2026',
    status: 'تم التصحيح',
  },
].map((report, index) => ({ ...report, index }));

const REPORT_VARIANTS: NonNullable<BadgeProps['variant']>[] = ['info', 'warning', 'success'];
const REPORT_MENU = ['عرض تفاصيل البلاغ', 'وضع علامة: تم التصحيح'];

// The period: the 30 days up to 28 September 2026.
const PERIOD: DateRange = { from: new Date(2026, 7, 30), to: new Date(2026, 8, 28) };

const reportColumns = createDataTableColumnHelper<ReportRow>();

const REPORT_COLUMNS = reportColumns.columns([
  reportColumns.accessor('title', {
    header: 'البلاغ',
    cell: (info) => (
      <div className="flex flex-col">
        <span>{info.row.original.title}</span>
        <span className="text-caption text-muted-foreground">الحقل: {info.row.original.field}</span>
      </div>
    ),
  }),
  reportColumns.accessor('space', {
    header: 'المساحة',
    cell: (info) => (
      <div className="flex flex-col">
        <span>{info.row.original.space}</span>
        <span className="text-caption text-muted-foreground">{info.row.original.area}</span>
      </div>
    ),
  }),
  reportColumns.accessor('reporter', { header: 'المُبلِّغ' }),
  reportColumns.accessor((report) => sortableDate(report.date), {
    id: 'date',
    header: 'التاريخ',
    enableSorting: true,
    cell: (info) => <span dir="ltr">{info.row.original.date}</span>,
  }),
  reportColumns.display({
    id: 'status',
    header: 'حالة البلاغ',
    cell: (info) => (
      <Badge variant={REPORT_VARIANTS[info.row.original.index] ?? 'neutral'}>
        {info.row.original.status}
      </Badge>
    ),
  }),
  reportColumns.display({
    id: 'actions',
    cell: (info) => <RowActions name={info.row.original.title} items={REPORT_MENU} />,
    meta: { className: 'w-px' },
  }),
]);

function renderReport(report: ReportRow) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Badge variant={REPORT_VARIANTS[report.index] ?? 'neutral'}>{report.status}</Badge>
        <span className="text-body-sm">{report.title}</span>
        <span className="text-caption text-muted-foreground">
          <span dir="ltr">{report.date}</span> · {report.field} · {report.space}
        </span>
      </div>
      <RowActions name={report.title} items={REPORT_MENU} />
    </div>
  );
}

function FilterList({
  trigger,
  type,
  defaultValue,
  search,
  placeholder,
  list,
  emptyText,
  options,
}: {
  trigger: string;
  type: 'single' | 'multiple';
  defaultValue?: string[];
  search: string;
  placeholder: string;
  list: string;
  emptyText: string;
  options: string[];
}) {
  const content = (
    <ComboboxContent
      searchLabel={search}
      searchPlaceholder={placeholder}
      listLabel={list}
      emptyText={emptyText}
    >
      {options.map((option, index) => (
        <ComboboxItem key={option} value={String(index)}>
          {option}
        </ComboboxItem>
      ))}
    </ComboboxContent>
  );
  return type === 'multiple' ? (
    <Combobox type="multiple" defaultValue={defaultValue}>
      <ComboboxTrigger className="w-auto">{trigger}</ComboboxTrigger>
      {content}
    </Combobox>
  ) : (
    <Combobox type="single">
      <ComboboxTrigger className="w-auto">{trigger}</ComboboxTrigger>
      {content}
    </Combobox>
  );
}

function ReportFilters() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        aria-label="ابحث في البلاغات"
        placeholder="ابحث في البلاغات"
        startIcon={<SearchIcon />}
        className="w-full md:w-64"
      />
      <FilterList
        trigger="الحالة: 2 محدّدة"
        type="multiple"
        defaultValue={['0', '1']}
        search="البحث في حالات البلاغ"
        placeholder="اكتب جزءاً من الحالة"
        list="حالات البلاغ للفلترة"
        emptyText="لا توجد حالة تطابق هذا البحث"
        options={[
          'بلاغ بيانات جديد',
          'بلاغ بيانات قيد المراجعة',
          'بلاغ بيانات مصحّح',
          'بلاغ بيانات مرفوض',
        ]}
      />
      <FilterList
        trigger="المنطقة: الكل"
        type="single"
        search="البحث في قائمة المناطق"
        placeholder="اكتب جزءاً من اسم المنطقة"
        list="المناطق في قطاع غزة"
        emptyText="لا توجد منطقة تطابق هذا البحث"
        options={['حي الرمال', 'حي تل الهوا', 'حي الشجاعية', 'مخيم النصيرات', 'مدينة دير البلح']}
      />
      <FilterList
        trigger="نوع المعلومة: الكل"
        type="single"
        search="البحث في أنواع المعلومات"
        placeholder="اكتب جزءاً من نوع المعلومة"
        list="أنواع المعلومات للفلترة"
        emptyText="لا يوجد نوع معلومة يطابق هذا البحث"
        options={['أسعار المساحة', 'ساعات عمل المساحة', 'الموقع على الخريطة', 'مرافق المساحة']}
      />
      <DatePicker>
        <DatePickerTrigger className="w-auto">آخر 30 يوماً</DatePickerTrigger>
        <DatePickerContent label="اختيار مدة البلاغات">
          <Calendar
            lang="ar"
            mode="range"
            defaultMonth={PERIOD.from}
            selected={PERIOD}
            previousMonthLabel="عرض الشهر السابق"
            nextMonthLabel="عرض الشهر التالي"
          />
        </DatePickerContent>
      </DatePicker>
    </div>
  );
}

/** Admin › Data reports: a filter row, row menus, and the pagination footer. */
export function Reports() {
  return (
    <DataTable
      label="بلاغات البيانات من المستخدمين"
      columns={REPORT_COLUMNS}
      data={REPORTS}
      getRowId={(report) => report.title}
      renderCard={renderReport}
      empty={null}
      toolbar={<ReportFilters />}
      summary="عرض 1–3 من 20"
      pagination={<MembersPagination />}
      className="w-full"
    />
  );
}
