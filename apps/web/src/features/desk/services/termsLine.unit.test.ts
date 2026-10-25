import { describe, expect, it } from 'vitest';
import { subscriptionState } from '../../../test/deskCustomer';
import { termsLine } from './termsLine';

const words = {
  totalDays: ({ count }: { count: number }) => (count === 1 ? '1 day' : `${String(count)} days`),
  daysPerWeek: ({ count }: { count: number }) => `${String(count)} a week`,
  hoursPerDay: ({ count }: { count: number }) => `${String(count)} h a day`,
  totalHours: ({ count }: { count: number }) => `${String(count)} h in all`,
  student: 'Students',
  none: 'No extra terms',
};

describe('termsLine', () => {
  it('says each limit the subscription has, and whether it is for students', () => {
    expect(
      termsLine(
        subscriptionState({
          totalDays: 12,
          daysPerWeek: 3,
          hoursPerDay: 6,
          totalHours: 40,
          audience: 'STUDENT',
        }),
        words,
      ),
    ).toBe('12 days · 3 a week · 6 h a day · 40 h in all · Students');
    expect(termsLine(subscriptionState({ totalDays: 1, daysPerWeek: null }), words)).toBe('1 day');
  });

  it('says it has no extra terms when it has none', () => {
    expect(
      termsLine(
        subscriptionState({
          totalDays: null,
          daysPerWeek: null,
          hoursPerDay: null,
          totalHours: null,
          audience: 'GENERAL',
        }),
        words,
      ),
    ).toBe('No extra terms');
  });
});
