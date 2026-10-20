import type { SpaceSettings } from '@masaha/shared/space-settings';
import { Toaster, toast } from '@shared/design-system';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { usePricingCard } from './usePricingCard';

type Card = ReturnType<typeof usePricingCard>;
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const SETTINGS: SpaceSettings = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'UP_AFTER_MINUTES',
  visitRoundingMinutes: 10,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: null,
};

/** The card of space 7 on `settings`, the server answering every save with the settings sent. */
function renderCard(settings: SpaceSettings = SETTINGS) {
  const requests: Request[] = fakeTransport((request) =>
    ok({ ...settings, ...(bodyOf(request) as object) }),
  );
  const rendered = renderHook(() => usePricingCard({ spaceId: 7, settings }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, requests };
}

async function typeMinutes(result: { current: Card }, value: string) {
  const { binding } = result.current.rounding.upAfter.minutes;
  await act(async () => {
    await binding.onChange({ target: { name: binding.name, value } });
  });
}

async function save(result: { current: Card }) {
  await act(async () => {
    result.current.frame.save.submit();
    await Promise.resolve();
  });
}

beforeEach(() => {
  startPreferences('en');
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('usePricingCard', () => {
  it('enables the minutes only for "up after", with its example', () => {
    const { result } = renderCard();

    expect(result.current.rounding.upAfter.minutes.binding.disabled).toBe(false);
    expect(result.current.rounding.upAfter.example).toBe('2 h 9 min = 2 h · 2 h 11 min = 3 h');
    act(() => {
      result.current.rounding.choose('NEAREST_HALF_HOUR');
    });
    expect(result.current.rounding.upAfter.minutes.binding.disabled).toBe(true);
    expect(result.current.rounding.upAfter.example).toBeNull();
  });

  it('sends the rule and its minutes together, the minutes none for another rule', async () => {
    const { result, requests } = renderCard();
    act(() => {
      result.current.rounding.choose('NEAREST_HALF_HOUR');
    });
    await save(result);
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(bodyOf(requests[0])).toEqual({
      visitRounding: 'NEAREST_HALF_HOUR',
      visitRoundingMinutes: null,
    });

    const other = renderCard();
    await typeMinutes(other.result, '١٥');
    await save(other.result);
    await waitFor(() => {
      expect(other.requests).toHaveLength(1);
    });
    expect(bodyOf(other.requests[0])).toEqual({
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
    });
  });

  it('refuses 0 and 60 minutes before sending', async () => {
    const { result, requests } = renderCard();

    for (const minutes of ['0', '60']) {
      await typeMinutes(result, minutes);
      await save(result);
      await waitFor(() => {
        expect(result.current.rounding.upAfter.minutes.error).toBe('From 1 to 59 minutes');
      });
    }
    expect(requests).toHaveLength(0);
  });

  it('sends nothing for a save that changed nothing, and says so', async () => {
    const { result, requests } = renderCard();
    act(() => {
      result.current.cap.toggle(false);
    });
    act(() => {
      result.current.cap.toggle(true);
    });

    await save(result);

    await waitFor(() => {
      expect(result.current.frame.note).toBe('Nothing changed');
    });
    expect(requests).toHaveLength(0);
  });
});
