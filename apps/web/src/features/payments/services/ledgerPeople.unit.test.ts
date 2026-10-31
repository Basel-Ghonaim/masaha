import { describe, expect, it } from 'vitest';
import { ledgerPeople } from './ledgerPeople';

describe('ledgerPeople', () => {
  it('names the owner signed in, then the space’s other owners, then its reception accounts', () => {
    expect(
      ledgerPeople({
        self: { id: 14, name: 'Ahmad' },
        owners: [
          { id: 14, name: 'Ahmad' },
          { id: 16, name: 'Mona' },
        ],
        reception: [
          { id: 15, name: 'Laila', active: true },
          { id: 35, name: 'Rami', active: false },
        ],
      }),
    ).toEqual([
      { id: 14, name: 'Ahmad', self: true, active: true },
      { id: 16, name: 'Mona', self: false, active: true, owner: true },
      { id: 15, name: 'Laila', self: false, active: true },
      { id: 35, name: 'Rami', self: false, active: false },
    ]);
  });

  it('keeps the reception accounts when the owners are not read, and no one signed in', () => {
    expect(
      ledgerPeople({
        self: null,
        owners: [],
        reception: [{ id: 15, name: 'Laila', active: true }],
      }),
    ).toEqual([{ id: 15, name: 'Laila', self: false, active: true }]);
  });
});
