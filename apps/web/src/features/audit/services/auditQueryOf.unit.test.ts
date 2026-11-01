import { describe, expect, it } from 'vitest';
import { actionsOf } from './actionGroups';
import { auditParamsOf, auditQueryOf } from './auditQueryOf';

const query = (scope: 'space' | 'platform', search: string) =>
  auditQueryOf(scope, new URLSearchParams(search));

describe('auditQueryOf', () => {
  it('reads no filter as the last 30 days, page 1, 20 a page', () => {
    expect(query('space', '')).toEqual({
      filters: { period: 'LAST_30_DAYS', page: 1 },
      request: { period: 'LAST_30_DAYS', page: 1, limit: 20 },
    });
  });

  it('reads the search, the period, the actor, the type and the page, the type sent as its actions', () => {
    const { filters, request } = query(
      'space',
      '?q=+Ali+&period=all&actor=masaha&type=payments&page=3',
    );
    expect(filters).toEqual({
      q: 'Ali',
      period: 'ALL',
      actor: 'MASAHA',
      group: 'payments',
      page: 3,
    });
    expect(request).toEqual({
      period: 'ALL',
      q: 'Ali',
      actions: actionsOf('space', 'payments').join(','),
      actor: 'MASAHA',
      page: 3,
      limit: 20,
    });
    expect(query('space', '?actor=system').filters.actor).toBe('SYSTEM');
    expect(query('space', '?actor=12').filters.actor).toBe(12);
  });

  it('falls back to none for what the server would refuse', () => {
    expect(query('platform', '?actor=masaha&type=payments&period=week&page=0').filters).toEqual({
      period: 'LAST_30_DAYS',
      page: 1,
    });
    expect(query('space', `?q=${'x'.repeat(81)}&actor=-1`).filters).toEqual({
      period: 'LAST_30_DAYS',
      page: 1,
    });
  });

  it('writes the address back, the defaults left out', () => {
    expect(auditParamsOf({ period: 'LAST_30_DAYS', page: 1 }).toString()).toBe('');
    const search = auditParamsOf({
      q: 'Ali',
      period: 'ALL',
      actor: 'MASAHA',
      group: 'staff',
      page: 2,
    });
    expect(search.toString()).toBe('q=Ali&period=all&actor=masaha&type=staff&page=2');
    expect(query('space', search.toString()).filters).toEqual({
      q: 'Ali',
      period: 'ALL',
      actor: 'MASAHA',
      group: 'staff',
      page: 2,
    });
  });
});
