import type {
  AuditActor,
  AuditEntry,
  AuditMeta,
  AuditTarget,
  PlatformAuditEntry,
} from '@masaha/shared/audit';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { spaceNameOf, type SpaceNameView } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createAuditRepository } from '../repository/auditRepository';
import { groupsOf } from '../services/actionGroups';
import { actionView } from '../services/actionWords';
import { atText } from '../services/atText';
import { detailsOf } from '../services/detailsOf';
import { targetOf } from '../services/targetOf';
import type { AuditActorKey } from '../types/AuditActorKey';
import type { AuditRowView } from '../types/AuditRowView';
import type { AuditScope } from '../types/AuditScope';
import { auditKeys } from './queryKeys';
import { useAuditFilters } from './useAuditFilters';

const repository = createAuditRepository();

/** «الكل» / «كل الإجراءات»: no filter, as a choice's value. */
const ALL = 'all';

type Entry = AuditEntry & { space?: PlatformAuditEntry['space'] };

/** An actor as a choice's value: a person's id, `MASAHA` or `SYSTEM`. */
const keyOf = (actor: AuditActor): string =>
  actor.kind === 'PERSON' ? String(actor.id) : actor.kind;

/** A choice's value back to the actor it names; `all` is none. */
function actorOfKey(value: string): AuditActorKey | undefined {
  if (value === 'MASAHA' || value === 'SYSTEM') return value;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/**
 * A log, ready to render (D6.1): the space's for its owner (`scope: 'space'`), the platform's events
 * for the admin (`'platform'`), 20 entries a page, newest first, searched by target and filtered by
 * period, actor and action type — every filter and the page in the address (S8). Each entry its
 * time, its actor (a person by name, «فريق مساحة» or «النظام»), its action's badge (red for a
 * destructive act), its target with a link where the page gives one (`linkOf`), the admin's space
 * under it, and its details where its values say something. The actor filter shows only when the
 * period has more than one actor (or one is chosen). Its states as the other lists': loading,
 * failed with its retry, empty, no match.
 */
export function useAuditLog({
  scope,
  spaceId,
  spaceName,
  linkOf,
}: {
  scope: AuditScope;
  /** The space whose log the owner reads; none for the admin's. */
  spaceId?: number;
  /** The space's name, for the owner's intro line, once known. */
  spaceName?: SpaceNameView;
  /** Where a target has a page, as the page routes it; none where it has none. */
  linkOf: (target: AuditTarget) => string | null;
}) {
  const copy = useCopy();
  const words = copy.audit;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const english = language === 'en';
  const filters = useAuditFilters(scope);
  const { request } = filters;
  const space = spaceId ?? 0;
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<Page<Entry[], AuditMeta>, AppError>({
    queryKey: scope === 'space' ? auditKeys.space(space, request) : auditKeys.platform(request),
    queryFn: () =>
      scope === 'space' ? repository.space(space, request) : repository.platform(request),
    placeholderData: keepPreviousData,
  });
  const answer = result.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? result.error : null,
    words.loadFailed,
  );
  const pastLast = usePageInRange({
    answer,
    placeholder: result.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });

  const actorText = (actor: AuditActor) =>
    actor.kind === 'PERSON'
      ? { text: actor.name, person: true }
      : { text: words.actors[actor.kind], person: false };
  const detailsWords = {
    details: words.details,
    methods: copy.desk.money.methods,
    states: {
      AVAILABLE: copy.terms.liveStatuses.available,
      FULL: copy.terms.liveStatuses.full,
      CLOSED: copy.terms.liveStatuses.closedNow,
    },
  };
  const rows = (answer?.data ?? []).map((entry): AuditRowView => {
    const named = entry.space ?? null;
    return {
      key: String(entry.id),
      at: atText(entry.at, language),
      actor: actorText(entry.actor),
      action: actionView(entry.action, words.actions, scope),
      target: targetOf(entry.target, words, english, linkOf),
      // The space the entry names, under a target that is not that space.
      space:
        named === null || entry.target.type === 'space'
          ? null
          : words.at({ space: isolate(spaceNameOf(named, english).text) }),
      details: detailsOf(entry, detailsWords, language),
    };
  });

  const { period, actor, group } = filters.filters;
  // The period's actors the filter may name: the admin's log filters by a person only.
  const actors = (answer?.meta.actors ?? []).filter(
    (each) => scope === 'space' || each.kind === 'PERSON',
  );
  const total = answer?.meta.totalRecords ?? 0;
  const groups = groupsOf(scope);

  return {
    label: words.label,
    intro:
      scope === 'platform'
        ? words.intro.platform
        : spaceName === undefined
          ? null
          : words.intro.space({ space: isolate(spaceName.text) }),
    columns: words.columns,
    search: {
      label: words.search.label,
      placeholder: words.search.placeholder[scope],
      text: filters.search.text,
      change: filters.search.change,
    },
    filters: {
      period: {
        label: words.filters.period.label,
        value: period,
        options: (['LAST_30_DAYS', 'ALL'] as const).map((value) => ({
          value,
          label: words.filters.period[value],
        })),
        choose: (value: string) => {
          filters.apply({ period: value === 'ALL' ? 'ALL' : 'LAST_30_DAYS' });
        },
      },
      /** «المنفّذ», only when the period has more than one actor, or one is chosen. */
      actor:
        answer === undefined || (answer.meta.actors.length < 2 && actor === undefined)
          ? null
          : {
              label: words.filters.actor.label,
              value: actor === undefined ? ALL : String(actor),
              options: [
                { value: ALL, label: words.filters.actor.all },
                ...actors.map((each) => ({ value: keyOf(each), label: actorText(each).text })),
              ],
              choose: (value: string) => {
                filters.apply({ actor: value === ALL ? undefined : actorOfKey(value) });
              },
            },
      type: {
        label: words.filters.type.label,
        value: group ?? ALL,
        options: [
          { value: ALL, label: words.filters.type.all },
          ...groups.map((value) => ({ value, label: words.groups[value] })),
        ],
        choose: (value: string) => {
          filters.apply({ group: groups.find((each) => each === value) });
        },
      },
      /** The phone's sheet that holds the period, the actor and the action type. */
      sheet: {
        title: words.filters.title,
        label:
          filters.applied > 0
            ? words.filters.applied({ count: filters.applied })
            : words.filters.title,
        count: filters.applied,
        show:
          answer !== undefined && total === 0
            ? words.filters.none
            : words.filters.show({ count: total }),
        clear: { label: words.filters.clear, run: filters.clear, disabled: filters.applied === 0 },
        closeLabel: words.filters.close,
      },
    },
    count: answer === undefined ? undefined : words.count({ count: total }),
    state:
      result.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : rows.length > 0
            ? ('ready' as const)
            : filters.anyApplied
              ? ('noMatch' as const)
              : ('empty' as const),
    rows,
    /** Another page or filter is loading, the rows shown meanwhile those already there. */
    busy: result.isPlaceholderData,
    empty: filters.anyApplied ? words.empty.noMatch : words.empty.none,
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void result.refetch();
      },
    },
  };
}

/** A log, ready to render. */
export type AuditLogView = ReturnType<typeof useAuditLog>;
