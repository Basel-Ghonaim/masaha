import { gazaClockOf } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, dayText } from '@shared/lib';
import { paginationView, rangeSummary } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { useSearchParams } from 'react-router';
import type { LogEntry } from '../../types/LogEntry';
import { useDayLogQuery } from './useDayLogQuery';

/** The address's day the owner chose, `YYYY-MM-DD`; none for today. */
export const LOG_DAY_PARAM = 'logDay';
/** The address's page of the log, from 2. */
const PAGE_PARAM = 'logPage';
/** The log's rows a page, paged in the browser (DI24). */
const PAGE_SIZE = 20;

const pageOf = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
};
const isDate = (value: string | null): value is string =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
const twoDigits = (value: number) => String(value).padStart(2, '0');

/**
 * «السجل» (K8, D7.1), ready to render: the owner's chosen day (today by default, never after it),
 * reception's today with no picker (DI23); the day's visits and check-ins merged, 20 to a page with
 * their range (S6, DI24); each row's name, its kind — the subscription's name, «زيارة» or «زيارة ·
 * طالب» —, in and out on Gaza's clock, the stay «{h}:{mm}» (to now while open), how it ended, and
 * a written-off visit's mark. The day and the page live in the address.
 */
export function useDeskLog(spaceId: number, owner: boolean, now: Date = new Date()) {
  const copy = useCopy();
  const words = copy.desk.log;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [search, setSearch] = useSearchParams();
  const today = gazaClockOf(now).date;
  const asked = search.get(LOG_DAY_PARAM);
  // Reception reads today only; a day after today is today.
  const chosen = owner && isDate(asked) && asked < today ? asked : null;
  const query = useDayLogQuery(spaceId, owner ? (chosen ?? today) : null, today);
  const entries = query.data ?? [];
  const pages = Math.ceil(entries.length / PAGE_SIZE);
  const page = Math.min(pageOf(search.get(PAGE_PARAM)), Math.max(pages, 1));
  const { view, blocked } = useRefusalView(
    query.data === undefined ? query.error : null,
    words.loadFailed,
  );

  const timeOf = (instant: string) => isolate(clockOf(gazaClockOf(new Date(instant)).minute));
  const durationOf = (entry: LogEntry) => {
    const end = entry.checkedOutAt === null ? now.getTime() : Date.parse(entry.checkedOutAt);
    const minutes = Math.max(0, Math.floor((end - Date.parse(entry.checkedInAt)) / 60_000));
    return isolate(
      words.duration({
        hours: String(Math.floor(minutes / 60)),
        minutes: twoDigits(minutes % 60),
      }),
    );
  };
  const rows = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => ({
    key: entry.key,
    name: entry.name,
    customerId: entry.customerId,
    kind:
      entry.subscription !== null
        ? { label: entry.subscription, variant: 'primary' as const }
        : {
            label: entry.student ? words.kinds.student : words.kinds.visit,
            variant: 'neutral' as const,
          },
    in: timeOf(entry.checkedInAt),
    out: entry.checkedOutAt === null ? words.stillHere : timeOf(entry.checkedOutAt),
    duration: durationOf(entry),
    ended: entry.checkoutMethod === null ? null : words.methods[entry.checkoutMethod],
    writtenOff: entry.writtenOff ? words.writtenOff : null,
  }));
  const searchOf = (target: number) => {
    const next = new URLSearchParams(search);
    if (target > 1) next.set(PAGE_PARAM, String(target));
    else next.delete(PAGE_PARAM);
    const text = next.toString();
    return text === '' ? '' : `?${text}`;
  };

  return {
    title: words.title,
    table: words.table,
    columns: words.columns,
    day: owner
      ? {
          label: words.day,
          text: chosen === null ? words.today : dayText(chosen, language),
          chosen: chosen ?? today,
          today,
          calendar: words.calendar,
          choose: (date: string) => {
            setSearch(
              (current) => {
                const next = new URLSearchParams(current);
                if (date < today) next.set(LOG_DAY_PARAM, date);
                else next.delete(LOG_DAY_PARAM);
                next.delete(PAGE_PARAM);
                return next;
              },
              { replace: true },
            );
          },
        }
      : null,
    todayLine: words.today,
    state: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? query.error.type === 'network' || query.error.type === 'timeout'
          ? ('offline' as const)
          : ('failed' as const)
        : entries.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    rows,
    busy: query.isPlaceholderData,
    empty: words.empty,
    summary:
      rangeSummary(
        { currentPage: page, limit: PAGE_SIZE, totalRecords: entries.length },
        { range: copy.forms.listRange },
      ) ?? undefined,
    pagination: paginationView({
      current: page,
      total: pages,
      words: words.pagination,
      searchOf,
    }),
    offline: { title: copy.status.offline.title, text: copy.status.offline.description },
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
  };
}

/** «السجل», ready to render. */
export type DeskLogView = ReturnType<typeof useDeskLog>;
/** One row of the log. */
export type DeskLogRow = DeskLogView['rows'][number];
