import { describe, expect, it } from 'vitest';
import { ledgerQueryOf, paramsOf } from './ledgerQueryOf';

const read = (search: string) => ledgerQueryOf(new URLSearchParams(search));

describe('ledgerQueryOf', () => {
  it('reads every filter by the contract’s rule, the voided hidden unless asked for', () => {
    expect(
      read('from=2026-10-01&to=2026-10-21&staff=15&method=TRANSFER&kind=VISIT&voided=1&page=3'),
    ).toEqual({
      filters: {
        from: '2026-10-01',
        to: '2026-10-21',
        staff: 15,
        method: 'TRANSFER',
        kind: 'VISIT',
        voided: true,
        page: 3,
      },
      query: {
        from: '2026-10-01',
        to: '2026-10-21',
        recordedById: 15,
        method: 'TRANSFER',
        kind: 'VISIT',
        voided: 'INCLUDE',
        page: 3,
        limit: 20,
      },
    });
    expect(read('').query).toEqual({ voided: 'EXCLUDE', page: 1, limit: 20 });
    expect(read('voided=yes').filters.voided).toBe(false);
  });

  it('drops half a range, an inverted one and one of 93 days, and keeps 92', () => {
    expect(read('from=2026-10-01').filters).toEqual({ voided: false, page: 1 });
    expect(read('to=2026-10-01').filters).toEqual({ voided: false, page: 1 });
    expect(read('from=2026-10-21&to=2026-10-01').filters).toEqual({ voided: false, page: 1 });
    expect(read('from=2026-07-22&to=2026-10-22').filters).toEqual({ voided: false, page: 1 });
    expect(read('from=2026-07-23&to=2026-10-22').filters).toMatchObject({
      from: '2026-07-23',
      to: '2026-10-22',
    });
    expect(read('from=2026-10-21&to=2026-10-21').query).toMatchObject({
      from: '2026-10-21',
      to: '2026-10-21',
    });
  });

  it('drops a value the server would refuse', () => {
    expect(
      read('from=2026-02-30&to=2026-03-01&staff=0&method=CARD&kind=CHECK_IN&page=-1').filters,
    ).toEqual({ voided: false, page: 1 });
    expect(read('staff=1.5&page=abc').filters).toEqual({ voided: false, page: 1 });
  });

  it('writes no default into the address', () => {
    expect(paramsOf({ voided: false, page: 1 }).toString()).toBe('');
    expect(
      paramsOf({
        from: '2026-10-01',
        to: '2026-10-21',
        staff: 15,
        voided: true,
        page: 2,
      }).toString(),
    ).toBe('from=2026-10-01&to=2026-10-21&staff=15&voided=1&page=2');
  });
});
