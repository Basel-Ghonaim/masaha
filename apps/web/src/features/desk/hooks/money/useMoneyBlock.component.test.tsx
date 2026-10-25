import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { startPreferences } from '../../../../test/startPreferences';
import { useMoneyBlock } from './useMoneyBlock';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | undefined) => line?.replace(/[⁦-⁩]/g, '');

function renderBlock(due: number, owesTo: string | null = null) {
  return renderHook(
    (props: { due: number; owesTo: string | null }) =>
      useMoneyBlock({ due: props.due, open: false, none: true, owesTo: props.owesTo }),
    { initialProps: { due, owesTo } },
  );
}

beforeEach(() => {
  startPreferences('en');
});

describe('useMoneyBlock', () => {
  it('fills «Received now» with the due and follows it until a figure is typed', () => {
    const { result, rerender } = renderBlock(1250);

    expect(result.current.received.text).toBe('12.50');
    expect(result.current.untouched).toBe(true);
    expect(result.current.recorded).toBe(1250);
    expect(result.current.line).toBe('Paid in full.');

    rerender({ due: 1500, owesTo: null });
    expect(result.current.received.text).toBe('15');
    expect(result.current.recorded).toBe(1500);

    act(() => {
      result.current.received.change('10');
    });
    rerender({ due: 2000, owesTo: null });
    expect(result.current.received.text).toBe('10');
    expect(result.current.untouched).toBe(false);
    expect(result.current.recorded).toBe(1000);
    expect(result.current.left).toBe(1000);
    expect(heard(result.current.line)).toBe(
      '₪10 stays owed by the mobile number’s holder — a mobile number is required',
    );
  });

  it('«Paid nothing» empties it, and «Receive the full amount» restores the due', () => {
    const { result } = renderBlock(1250, 'Omar');

    expect(result.current.toggle?.label).toBe('Paid nothing');
    act(() => {
      result.current.toggle?.run();
    });
    expect(result.current.received.text).toBe('');
    expect(result.current.recorded).toBe(0);
    expect(result.current.method).toBeNull();
    expect(heard(result.current.line)).toBe('₪12.50 stays owed by Omar');
    expect(result.current.toggle?.label).toBe('Receive the full amount');

    act(() => {
      result.current.toggle?.run();
    });
    expect(result.current.received.text).toBe('12.50');
    expect(result.current.untouched).toBe(true);
    expect(result.current.recorded).toBe(1250);
  });

  it('records the due and says the change above it; refuses a figure it cannot read', () => {
    const { result } = renderBlock(1250);

    act(() => {
      result.current.received.change('20');
    });
    expect(result.current.recorded).toBe(1250);
    expect(result.current.change).toBe(750);
    expect(heard(result.current.line)).toBe('₪7.50 change');
    expect(result.current.method?.value).toBe('CASH');

    act(() => {
      result.current.received.change('12.505');
    });
    expect(result.current.received.error).toBe('Enter an amount in shekels, up to two decimals');
  });
});
