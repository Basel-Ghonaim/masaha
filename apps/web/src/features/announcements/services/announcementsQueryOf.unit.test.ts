import { describe, expect, it } from 'vitest';
import { announcementsQueryOf, paramsOf } from './announcementsQueryOf';

const read = (search: string) => announcementsQueryOf(new URLSearchParams(search));

describe('announcementsQueryOf', () => {
  it('reads the tab and the page; running with none', () => {
    expect(read('state=ended&page=3')).toEqual({
      filters: { state: 'ENDED', page: 3 },
      query: { state: 'ENDED', page: 3, limit: 20 },
    });
    expect(read('state=upcoming').filters).toEqual({ state: 'UPCOMING', page: 1 });
    expect(read('').query).toEqual({ state: 'RUNNING', page: 1, limit: 20 });
  });

  it('falls back from a value the server would refuse, or one it never writes', () => {
    expect(read('state=deleted&page=0').filters).toEqual({ state: 'RUNNING', page: 1 });
    expect(read('state=ENDED&page=abc').filters).toEqual({ state: 'RUNNING', page: 1 });
    expect(read('state=running').filters).toEqual({ state: 'RUNNING', page: 1 });
  });
});

describe('paramsOf', () => {
  it('writes the tab and the page, no default', () => {
    expect(paramsOf({ state: 'RUNNING', page: 1 }).toString()).toBe('');
    expect(paramsOf({ state: 'UPCOMING', page: 1 }).toString()).toBe('state=upcoming');
    expect(paramsOf({ state: 'ENDED', page: 2 }).toString()).toBe('state=ended&page=2');
  });
});
