import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { debtsQuerySchema, financeMonthQuery, payersQuerySchema } from './requests.ts';

const errorsOf =
  (schema: typeof financeMonthQuery | typeof debtsQuerySchema | typeof payersQuerySchema) =>
  (input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? null : toFieldErrors(result.error.issues, input);
  };

describe("finance's queries", () => {
  it('a month YYYY-MM; a state OWES or CREDIT, OWES by default', () => {
    expect(financeMonthQuery.parse({})).toEqual({});
    expect(financeMonthQuery.parse({ month: '2026-10' })).toEqual({ month: '2026-10' });
    const month = errorsOf(financeMonthQuery);
    for (const wrong of ['2026-13', '2026-00', '2026-1', '26-10', '2026-10-01', 'October']) {
      expect(month({ month: wrong })).toEqual({ month: ['invalid_format'] });
    }

    expect(debtsQuerySchema.parse({})).toEqual({ page: 1, limit: 20, state: 'OWES' });
    expect(debtsQuerySchema.parse({ state: 'CREDIT', page: '2', limit: '50' })).toEqual({
      page: 2,
      limit: 50,
      state: 'CREDIT',
    });
    expect(errorsOf(debtsQuerySchema)({ state: 'PAID' })).toEqual({ state: ['invalid_choice'] });

    expect(payersQuerySchema.parse({ month: '2026-09', page: '3' })).toEqual({
      page: 3,
      limit: 20,
      month: '2026-09',
    });
    expect(errorsOf(payersQuerySchema)({ month: '2026-9', limit: '51' })).toEqual({
      month: ['invalid_format'],
      limit: ['out_of_range'],
    });
  });
});
