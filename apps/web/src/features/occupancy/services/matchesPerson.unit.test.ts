import type { PresentPerson } from '@masaha/shared/occupancy';
import { describe, expect, it } from 'vitest';
import { matchesPerson } from './matchesPerson';

const SARA: PresentPerson = {
  kind: 'CHECK_IN',
  id: 3,
  customerId: 4,
  name: 'سارة خالد',
  since: '2026-07-01T08:30:00.000Z',
};
const OMAR: PresentPerson = {
  kind: 'VISIT',
  id: 12,
  name: 'Omar Haddad',
  since: '2026-07-01T07:00:00.000Z',
  chargeNowAgorot: 1250,
};
const PHONES = new Map([[4, '+970599000201']]);

describe('matchesPerson', () => {
  it('matches a part of the name, whatever its case, the term trimmed', () => {
    expect(matchesPerson(SARA, ' سارة ', PHONES)).toBe(true);
    expect(matchesPerson(SARA, 'خالد', PHONES)).toBe(true);
    expect(matchesPerson(OMAR, 'hadd', PHONES)).toBe(true);
    expect(matchesPerson(OMAR, 'Layla', PHONES)).toBe(false);
  });

  it('matches a check-in by its customer’s phone’s last two digits or more, separators removed', () => {
    expect(matchesPerson(SARA, '01', PHONES)).toBe(true);
    expect(matchesPerson(SARA, '0 201', PHONES)).toBe(true);
    expect(matchesPerson(SARA, '1', PHONES)).toBe(false);
    expect(matchesPerson(SARA, '0599', PHONES)).toBe(false);
  });

  it('never matches a visit by digits, nor a check-in whose phone is unknown', () => {
    expect(matchesPerson(OMAR, '01', PHONES)).toBe(false);
    expect(matchesPerson(SARA, '01', new Map())).toBe(false);
  });

  it('matches nothing for an empty term', () => {
    expect(matchesPerson(SARA, '  ', PHONES)).toBe(false);
  });
});
