import { describe, expect, it } from 'vitest';
import { balanceView } from './balanceView';

const WORDS = {
  owes: ({ amount }: { amount: string }) => `Owes ${amount}`,
  credit: ({ amount }: { amount: string }) => `In credit ${amount}`,
  settled: 'Settled',
};
const price = (agorot: number) => `₪${String(agorot / 100)}`;

describe('balanceView', () => {
  it('says a debt as a warning, before any credit', () => {
    expect(balanceView({ debtAgorot: 3660, creditAgorot: 500 }, WORDS, price)).toEqual({
      label: 'Owes ₪36.6',
      tone: 'warning',
    });
  });

  it('says a credit as a success', () => {
    expect(balanceView({ debtAgorot: 0, creditAgorot: 500 }, WORDS, price)).toEqual({
      label: 'In credit ₪5',
      tone: 'success',
    });
  });

  it('says settled, neutral, with neither', () => {
    expect(balanceView({ debtAgorot: 0, creditAgorot: 0 }, WORDS, price)).toEqual({
      label: 'Settled',
      tone: 'neutral',
    });
  });
});
