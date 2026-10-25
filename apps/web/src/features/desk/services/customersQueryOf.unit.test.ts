import { describe, expect, it } from 'vitest';
import { customersQueryOf, paramsOf } from './customersQueryOf';

const read = (search: string, owner = true) => customersQueryOf(new URLSearchParams(search), owner);

describe('customersQueryOf', () => {
  it('reads each filter and the page, as the server would', () => {
    expect(read('q=%20Sara%20&status=ENDING_SOON&kind=CUSTOM&payment=OWES&page=3')).toEqual({
      filters: { q: 'Sara', status: 'ENDING_SOON', kind: 'CUSTOM', payment: 'OWES', page: 3 },
      query: {
        q: 'Sara',
        status: 'ENDING_SOON',
        kind: 'CUSTOM',
        payment: 'OWES',
        page: 3,
        limit: 20,
      },
    });
    expect(read('').query).toEqual({ page: 1, limit: 20 });
  });

  it('keeps «Archived» for the owner only', () => {
    expect(read('status=ARCHIVED', true).filters.status).toBe('ARCHIVED');
    expect(read('status=ARCHIVED', false).filters.status).toBeUndefined();
    expect(read('status=ARCHIVED', false).query).toEqual({ page: 1, limit: 20 });
  });

  it('falls back from a value the server would refuse', () => {
    expect(read(`q=${'a'.repeat(61)}&status=GONE&kind=PLAN&payment=MAYBE&page=0`).filters).toEqual({
      page: 1,
    });
    expect(read('q=%20%20&page=abc').filters).toEqual({ page: 1 });
  });
});

describe('paramsOf', () => {
  it('writes the filters and the page, no default', () => {
    expect(paramsOf({ page: 1 }).toString()).toBe('');
    expect(
      paramsOf({
        q: 'Sara',
        status: 'EXPIRED',
        kind: 'NONE',
        payment: 'SETTLED',
        page: 2,
      }).toString(),
    ).toBe('q=Sara&status=EXPIRED&kind=NONE&payment=SETTLED&page=2');
  });
});
