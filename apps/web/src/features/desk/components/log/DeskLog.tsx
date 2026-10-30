import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  Field,
  UsersIcon,
  WifiOffIcon,
} from '@shared/design-system';
import {
  Calendar,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
} from '@shared/design-system/calendar';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useDeskLog, type DeskLogRow, type DeskLogView } from '../../hooks/log/useDeskLog';

const column = createDataTableColumnHelper<DeskLogRow>();

/** A Gaza date (`YYYY-MM-DD`) as the calendar's day: that date at the browser's midnight. */
const dayOf = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};
/** The calendar's day as its date (`YYYY-MM-DD`), read on the browser's calendar it was drawn on. */
const dateOf = (day: Date) =>
  `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

/** A row's name, in its own direction: a link to the customer's file when there is a customer. */
function NameCell({ row, fileLink }: { row: DeskLogRow; fileLink: (id: number) => string }) {
  return row.customerId === null ? (
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
  );
}

/** The kind's badge, and a written-off visit's mark beside it. */
function KindCell({ row }: { row: DeskLogRow }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant={row.kind.variant}>{row.kind.label}</Badge>
      {row.writtenOff !== null && <Badge variant="neutral">{row.writtenOff}</Badge>}
    </span>
  );
}

/** The owner's day: a date picker, today by default, no day after today. */
function DayField({ day }: { day: NonNullable<DeskLogView['day']> }) {
  const lang = useLanguage() === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  return (
    <Field label={day.label} className="sm:w-56">
      <DatePicker open={open} onOpenChange={setOpen}>
        <DatePickerTrigger>{day.text}</DatePickerTrigger>
        <DatePickerContent label={day.label}>
          <Calendar
            lang={lang}
            mode="single"
            required
            defaultMonth={dayOf(day.chosen)}
            selected={dayOf(day.chosen)}
            disabled={{ after: dayOf(day.today) }}
            onSelect={(next: Date | undefined) => {
              if (next === undefined) return;
              day.choose(dateOf(next));
              setOpen(false);
            }}
            previousMonthLabel={day.calendar.previous}
            nextMonthLabel={day.calendar.next}
          />
        </DatePickerContent>
      </DatePicker>
    </Field>
  );
}

/**
 * «السجل» (K8): a section named by its heading, the day — the owner's picker, reception's «اليوم» —,
 * then the day's stays, a table from 768 px and a card each below it, 20 to a page with their range;
 * its states: loading, failed with a retry, offline (P7), and a day no one came.
 */
export function DeskLog({
  spaceId,
  owner,
  fileLink,
}: {
  spaceId: number;
  owner: boolean;
  fileLink: (customerId: number) => string;
}) {
  const log = useDeskLog(spaceId, owner);
  const headingId = useId();
  const { columns: headers } = log;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => <NameCell row={info.row.original} fileLink={fileLink} />,
        }),
        column.display({
          id: 'kind',
          header: headers.kind,
          cell: (info) => <KindCell row={info.row.original} />,
        }),
        column.display({ id: 'in', header: headers.in, cell: (info) => info.row.original.in }),
        column.display({ id: 'out', header: headers.out, cell: (info) => info.row.original.out }),
        column.display({
          id: 'duration',
          header: headers.duration,
          cell: (info) => info.row.original.duration,
        }),
        column.display({
          id: 'ended',
          header: headers.ended,
          cell: (info) => info.row.original.ended,
        }),
      ]),
    [headers, fileLink],
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id={headingId} className="text-heading-3">
          {log.title}
        </h2>
        {log.day === null ? (
          <p className="text-body-sm text-muted-foreground">{log.todayLine}</p>
        ) : (
          <DayField day={log.day} />
        )}
      </div>
      {log.state === 'offline' ? (
        <EmptyState icon={<WifiOffIcon />} title={log.offline.title} description={log.offline.text}>
          <Button variant="outline" onClick={log.failure.retry}>
            {log.failure.retryLabel}
          </Button>
        </EmptyState>
      ) : log.state === 'failed' ? (
        <Alert variant="destructive">
          <AlertTitle>{log.failure.title}</AlertTitle>
          <AlertDescription>
            {log.failure.message}
            {log.failure.reference !== undefined && (
              <span className="block">{log.failure.reference}</span>
            )}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" disabled={log.failure.blocked} onClick={log.failure.retry}>
              {log.failure.retryLabel}
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <DataTable
          label={log.table}
          columns={columns}
          data={log.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <NameCell row={row} fileLink={fileLink} />
                <KindCell row={row} />
              </div>
              <span className="text-caption text-muted-foreground">
                {headers.in} {row.in} · {headers.out} {row.out} · {row.duration}
                {row.ended !== null && <> · {row.ended}</>}
              </span>
            </div>
          )}
          loading={log.state === 'loading'}
          refreshing={log.busy}
          loadingRows={3}
          empty={<EmptyState icon={<UsersIcon />} title={log.empty} />}
          summary={log.state === 'ready' ? log.summary : undefined}
          pagination={
            log.state === 'ready' &&
            log.pagination !== null && <ListPagination pagination={log.pagination} />
          }
        />
      )}
    </section>
  );
}
