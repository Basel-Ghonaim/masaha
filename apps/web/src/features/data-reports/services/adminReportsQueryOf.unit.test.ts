import { describe, expect, it } from 'vitest';
import { adminReportsParamsOf, adminReportsQueryOf } from './adminReportsQueryOf';

const read = (search: string) => adminReportsQueryOf(new URLSearchParams(search));

describe('adminReportsQueryOf', () => {
  it('reads every report, page 1, by default', () => {
    expect(read('')).toEqual({
      filters: { chip: 'all', page: 1 },
      query: { page: 1, limit: 20 },
    });
  });

  it('reads the status, the field, the space and the page', () => {
    expect(read('?status=decided&field=HOURS&space=7&page=2')).toEqual({
      filters: { chip: 'decided', field: 'HOURS', spaceId: 7, page: 2 },
      query: { status: 'DECIDED', field: 'HOURS', spaceId: 7, page: 2, limit: 20 },
    });
  });

  it('drops each value the server would refuse', () => {
    expect(read('?status=RESOLVED&field=PHOTOS&space=0&page=-1')).toEqual({
      filters: { chip: 'all', page: 1 },
      query: { page: 1, limit: 20 },
    });
    expect(read('?field=hours&space=seven').filters).toEqual({ chip: 'all', page: 1 });
    expect(read('?space=2147483648').filters).toEqual({ chip: 'all', page: 1 });
  });
});

describe('adminReportsParamsOf', () => {
  it('writes the filters and the page, the defaults left out', () => {
    expect(adminReportsParamsOf({ chip: 'all', page: 1 }).toString()).toBe('');
    expect(
      adminReportsParamsOf({ chip: 'open', field: 'PRICES', spaceId: 3, page: 4 }).toString(),
    ).toBe('status=open&field=PRICES&space=3&page=4');
  });
});
