import { spaceAuditQuerySchema, type AuditPeriod } from '@masaha/shared/audit';
import { DEFAULT_PAGE_SIZE } from '@masaha/shared/core';
import type { AuditActorKey } from '../types/AuditActorKey';
import type { AuditRequest } from '../types/AuditRequest';
import type { AuditScope } from '../types/AuditScope';
import { actionsOf, groupOf, type AuditGroup } from './actionGroups';

/** A log's filters and page, as the address holds them (S8). */
export type AuditFilters = {
  q?: string;
  period: AuditPeriod;
  actor?: AuditActorKey;
  group?: AuditGroup;
  page: number;
};

// The largest id an Int column holds.
const MAX_ID = 2_147_483_647;

/** A positive whole number from the address, else none. */
function positive(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 && number <= MAX_ID ? number : undefined;
}

/** The search a field's text makes, read by the server's rule: trimmed, 1–80, and none when empty. */
export function searchOf(text: string): string | undefined {
  const parsed = spaceAuditQuerySchema.shape.q.safeParse(text);
  return parsed.success ? parsed.data : undefined;
}

/**
 * The actor from the address: a person's id; on the owner's log also `masaha` (the admin, never
 * named) or `system` (the timed jobs). The admin's log filters by a person only (the contract).
 */
function actorOf(scope: AuditScope, value: string | null): AuditActorKey | undefined {
  if (scope === 'space' && value === 'masaha') return 'MASAHA';
  if (scope === 'space' && value === 'system') return 'SYSTEM';
  return positive(value);
}

/**
 * A log's filters and page from the address (`?q=&period=all&actor=&type=<group>&page=`, D6.1),
 * each read by the server's rule, so a value it would refuse falls back to none: no period is the
 * last 30 days; the type is one group of the scope's, sent as its actions. The request adds the
 * page's size, 20.
 */
export function auditQueryOf(
  scope: AuditScope,
  params: URLSearchParams,
): { filters: AuditFilters; request: AuditRequest } {
  const q = searchOf(params.get('q') ?? '');
  const period: AuditPeriod = params.get('period') === 'all' ? 'ALL' : 'LAST_30_DAYS';
  const actor = actorOf(scope, params.get('actor'));
  const group = groupOf(scope, params.get('type'));
  const filters: AuditFilters = {
    ...(q !== undefined && { q }),
    period,
    ...(actor !== undefined && { actor }),
    ...(group !== undefined && { group }),
    page: positive(params.get('page')) ?? 1,
  };
  return {
    filters,
    request: {
      period,
      ...(q !== undefined && { q }),
      ...(group !== undefined && { actions: actionsOf(scope, group).join(',') }),
      ...(actor !== undefined && { actor }),
      page: filters.page,
      limit: DEFAULT_PAGE_SIZE,
    },
  };
}

/** The address of a log's filters and page, the defaults left out. */
export function auditParamsOf({ q, period, actor, group, page }: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (q !== undefined) params.set('q', q);
  if (period === 'ALL') params.set('period', 'all');
  if (actor !== undefined)
    params.set('actor', typeof actor === 'number' ? String(actor) : actor.toLowerCase());
  if (group !== undefined) params.set('type', group);
  if (page !== 1) params.set('page', String(page));
  return params;
}
