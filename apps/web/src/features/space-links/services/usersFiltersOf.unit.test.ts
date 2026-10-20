import { describe, expect, it } from 'vitest';
import { usersFiltersOf, usersParamsOf, usersRequestOf } from './usersFiltersOf';

describe('usersFiltersOf', () => {
  it('reads the search, the state and the page by the contract’s rules, an invalid one falling back to its default', () => {
    expect(usersFiltersOf(new URLSearchParams('q=%20Rima%20&state=suspended&page=2'))).toEqual({
      q: 'Rima',
      state: 'suspended',
      page: 2,
    });
    expect(usersFiltersOf(new URLSearchParams('q=%20&state=gone&page=0'))).toEqual({ page: 1 });
  });

  it('reads the role by the contract’s rule, an unknown one dropped', () => {
    expect(usersFiltersOf(new URLSearchParams('role=admin'))).toEqual({ role: 'admin', page: 1 });
    expect(usersFiltersOf(new URLSearchParams('role=gone&page=2'))).toEqual({ page: 2 });
  });

  it('writes the role to the address and asks for it', () => {
    expect(usersParamsOf({ q: 'Rima', role: 'owner', page: 2 }).toString()).toBe(
      'q=Rima&role=owner&page=2',
    );
    expect(usersRequestOf({ role: 'admin', page: 1 })).toEqual({ role: 'admin', page: 1 });
  });

  it('writes the address with the defaults left out', () => {
    expect(usersParamsOf({ q: 'Rima', state: 'active', page: 3 }).toString()).toBe(
      'q=Rima&state=active&page=3',
    );
    expect(usersParamsOf({ page: 1 }).toString()).toBe('');
  });

  it('asks for the filters as the contract names them', () => {
    expect(usersRequestOf({ q: 'Rima', state: 'suspended', page: 2 })).toEqual({
      q: 'Rima',
      state: 'suspended',
      page: 2,
    });
    expect(usersRequestOf({ page: 1 })).toEqual({ page: 1 });
  });
});
