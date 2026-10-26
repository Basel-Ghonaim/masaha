import { describe, expect, it } from 'vitest';
import { sheetInput, sheetSchema, type SheetValues } from './sheetRequest';

const VALUES: SheetValues = {
  name: '',
  phone: '',
  choice: 'pkg-3',
  startsOn: '2026-11-01',
  custom: {
    name: 'Custom',
    audience: 'GENERAL',
    billing: 'FIXED',
    priceAgorot: '',
    shiftId: '',
    endsOn: '',
    totalDays: '',
    daysPerWeek: '',
    hoursPerDay: '',
    totalHours: '',
    reason: '',
  },
  payment: { amountAgorot: 15000, method: 'CASH' },
};

const parsed = (values: SheetValues, newCustomer = false) => {
  const result = sheetSchema(newCustomer).safeParse(sheetInput(values, { newCustomer }));
  if (!result.success) throw new Error(JSON.stringify(result.error.issues));
  return result.data;
};

describe('sheetRequest', () => {
  it('sends a package’s id only, with the start and the amount recorded', () => {
    expect(parsed(VALUES)).toEqual({
      subscription: {
        packageId: 3,
        startsOn: '2026-11-01',
        payment: { amountAgorot: 15000, method: 'CASH' },
      },
    });
  });

  it('sends custom terms with their reason, and no package', () => {
    const custom = parsed({
      ...VALUES,
      choice: 'custom',
      custom: {
        ...VALUES.custom,
        name: 'Month at the window',
        billing: 'PER_DAY',
        priceAgorot: '12.5',
        audience: 'STUDENT',
        shiftId: '2',
        endsOn: '2026-11-30',
        daysPerWeek: '٣',
        reason: 'The owner’s offer',
      },
      payment: { amountAgorot: 0, method: 'CASH' },
    });
    expect(custom).toEqual({
      subscription: {
        custom: {
          name: 'Month at the window',
          billing: 'PER_DAY',
          priceAgorot: 1250,
          audience: 'STUDENT',
          shiftId: 2,
          endsOn: '2026-11-30',
          daysPerWeek: 3,
          reason: 'The owner’s offer',
        },
        startsOn: '2026-11-01',
      },
    });
    expect(custom.subscription).not.toHaveProperty('packageId');
  });

  it('refuses custom terms without their reason, on the reason', () => {
    const result = sheetSchema(false).safeParse(
      sheetInput(
        { ...VALUES, choice: 'custom', custom: { ...VALUES.custom, priceAgorot: '50' } },
        { newCustomer: false },
      ),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(({ path }) => path.join('.'))).toEqual(['custom.reason']);
    }
  });

  it('sends a new customer’s name and phone apart from the subscription', () => {
    expect(parsed({ ...VALUES, name: 'Sara Khalid', phone: '0599000305' }, true)).toEqual({
      customer: { name: 'Sara Khalid', phone: '+970599000305' },
      subscription: {
        packageId: 3,
        startsOn: '2026-11-01',
        payment: { amountAgorot: 15000, method: 'CASH' },
      },
    });
    expect(parsed({ ...VALUES, name: 'Sara Khalid' }, true).customer).toEqual({
      name: 'Sara Khalid',
    });
  });

  it('sends a published price by its key and the name the desk gives it, never a price id', () => {
    const published = new Map([
      [
        'price-MONTH-STUDENT-none',
        { period: 'MONTH' as const, audience: 'STUDENT' as const, name: 'Monthly · students' },
      ],
    ]);
    const input = sheetInput(
      { ...VALUES, choice: 'price-MONTH-STUDENT-none' },
      { newCustomer: false, published },
    );
    const result = sheetSchema(false).safeParse(input);
    expect(result.success && result.data).toEqual({
      subscription: {
        published: { period: 'MONTH', audience: 'STUDENT', name: 'Monthly · students' },
        startsOn: '2026-11-01',
        payment: { amountAgorot: 15000, method: 'CASH' },
      },
    });
    expect(input).not.toHaveProperty('priceId');
    expect(input).not.toHaveProperty('packageId');
  });

  it('sends the subscription a renewal renews', () => {
    const result = sheetSchema(false).safeParse(
      sheetInput(VALUES, { newCustomer: false, renewalOfId: 4 }),
    );
    expect(result.success && result.data.subscription.renewalOfId).toBe(4);
  });
});
