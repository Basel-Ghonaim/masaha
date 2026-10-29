import { describe, expect, it } from 'vitest';
import { reportsParamsOf, reportsQueryOf } from './reportsQueryOf';

const read = (search: string) => reportsQueryOf(new URLSearchParams(search));

describe('reportsQueryOf', () => {
  it('reads «الكل», page 1, by default: no status sent', () => {
    expect(read('')).toEqual({
      filters: { chip: 'all', page: 1 },
      query: { page: 1, limit: 20 },
    });
  });

  it('maps the chips to the two statuses the server filters', () => {
    expect(read('?status=open&page=3').query).toEqual({ status: 'OPEN', page: 3, limit: 20 });
    expect(read('?status=decided').query).toEqual({ status: 'DECIDED', page: 1, limit: 20 });
  });

  it('drops a value the server would refuse', () => {
    expect(read('?status=RESOLVED&page=0')).toEqual({
      filters: { chip: 'all', page: 1 },
      query: { page: 1, limit: 20 },
    });
    expect(read('?status=OPEN&page=two').filters).toEqual({ chip: 'all', page: 1 });
    expect(read('?page=2147483648').filters.page).toBe(1);
  });
});

describe('reportsParamsOf', () => {
  it('writes the chip and the page, the defaults left out', () => {
    expect(reportsParamsOf({ chip: 'all', page: 1 }).toString()).toBe('');
    expect(reportsParamsOf({ chip: 'decided', page: 2 }).toString()).toBe('status=decided&page=2');
  });
});
