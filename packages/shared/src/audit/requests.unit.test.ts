import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { AUDIT_ACTIONS } from './actions.ts';
import { spaceAuditQuerySchema } from './requests.ts';

const errorsOf = (input: unknown) => {
  const result = spaceAuditQuerySchema.safeParse(input);
  return result.success ? null : toFieldErrors(result.error.issues, input);
};

describe("the owner's audit query", () => {
  it('the period defaults to the last 30 days; actions are known, each once, at most 30; q 1–80; the actor an id, MASAHA or SYSTEM', () => {
    expect(spaceAuditQuerySchema.parse({})).toEqual({ page: 1, limit: 20, period: 'LAST_30_DAYS' });
    expect(
      spaceAuditQuerySchema.parse({
        period: 'ALL',
        q: ' أحمد ',
        actions: 'payment.recorded,payment.voided,payment.recorded',
        actor: '12',
        page: '2',
        limit: '50',
      }),
    ).toEqual({
      page: 2,
      limit: 50,
      period: 'ALL',
      q: 'أحمد',
      actions: ['payment.recorded', 'payment.voided'],
      actor: 12,
    });
    expect(spaceAuditQuerySchema.parse({ actor: 'MASAHA' }).actor).toBe('MASAHA');
    expect(spaceAuditQuerySchema.parse({ actor: 'SYSTEM' }).actor).toBe('SYSTEM');
    expect(spaceAuditQuerySchema.parse({ q: 'x'.repeat(80) }).q).toHaveLength(80);
    const thirty = AUDIT_ACTIONS.slice(0, 30).join(',');
    expect(spaceAuditQuerySchema.parse({ actions: thirty }).actions).toHaveLength(30);

    expect(errorsOf({ period: 'LAST_7_DAYS' })).toEqual({ period: ['invalid_choice'] });
    expect(errorsOf({ actions: 'payment.recorded,payment.stolen' })).toEqual({
      actions: ['invalid_choice'],
    });
    expect(errorsOf({ actions: '' })).toEqual({ actions: ['invalid_choice'] });
    expect(errorsOf({ actions: AUDIT_ACTIONS.slice(0, 31).join(',') })).toEqual({
      actions: ['too_long'],
    });
    expect(errorsOf({ q: 'x'.repeat(81) })).toEqual({ q: ['too_long'] });
    expect(errorsOf({ q: '   ' })).toEqual({ q: ['too_short'] });
    for (const actor of ['ADMIN', '1.5']) {
      expect(errorsOf({ actor })).toEqual({ actor: ['invalid_format'] });
    }
    for (const actor of ['0', '-3', '2147483648']) {
      expect(errorsOf({ actor })).toEqual({ actor: ['out_of_range'] });
    }
  });
});
