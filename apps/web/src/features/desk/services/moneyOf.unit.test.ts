import { describe, expect, it } from 'vitest';
import { moneyOf } from './moneyOf';

describe('moneyOf', () => {
  it('records never above the due for a visit, and gives the change above it', () => {
    expect(moneyOf(1250, 2000, false)).toEqual({ recorded: 1250, change: 750, left: 0, credit: 0 });
    expect(moneyOf(1250, 1250, false)).toEqual({ recorded: 1250, change: 0, left: 0, credit: 0 });
  });

  it('leaves the remainder below the due', () => {
    expect(moneyOf(1250, 500, false)).toEqual({ recorded: 500, change: 0, left: 750, credit: 0 });
    expect(moneyOf(1250, 0, false)).toEqual({ recorded: 0, change: 0, left: 1250, credit: 0 });
  });

  it('records the whole amount above the due of a usage-based one, the rest as credit', () => {
    expect(moneyOf(1000, 1500, true)).toEqual({ recorded: 1500, change: 0, left: 0, credit: 500 });
    expect(moneyOf(1000, 400, true)).toEqual({ recorded: 400, change: 0, left: 600, credit: 0 });
  });
});
