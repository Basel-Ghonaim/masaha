import { OVERRIDE_DURATIONS, type SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useLiveStatusControl } from './useLiveStatusControl';

const AUTOMATIC: SpaceOccupancyNow = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 3,
  override: null,
  people: [],
};

/** Full by hand, with 84 minutes left: its end half a minute short of them, rounded up. */
function overridden(): SpaceOccupancyNow {
  const until = new Date(Date.now() + 84 * 60_000 - 30_000).toISOString();
  return { ...AUTOMATIC, status: 'FULL', override: { state: 'FULL', until } };
}

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | null | undefined) => line?.replace(/[⁦-⁩]/g, '');

function renderControl(answer: Parameters<typeof fakeTransport>[0]) {
  const requests = fakeTransport(answer);
  const hook = renderHook(() => useLiveStatusControl(7), { wrapper: queryWrapper() });
  return { ...hook, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useLiveStatusControl', () => {
  it('shows what visitors see, and under an override its time left', async () => {
    const automatic = renderControl(() => ok(AUTOMATIC));
    await waitFor(() => {
      expect(heard(automatic.result.current.trigger.label)).toBe('Visitors see: Available');
    });
    expect(automatic.result.current.trigger).toMatchObject({
      word: 'Available',
      tone: 'success',
      disabled: false,
      reason: null,
    });
    expect(heard(automatic.result.current.trigger.name)).toBe(
      'Visitors see: Available — change it',
    );
    expect(automatic.result.current.panel.back).toBeNull();
    automatic.unmount();
    restoreTransport();

    const manual = renderControl(() => ok(overridden()));
    await waitFor(() => {
      expect(heard(manual.result.current.trigger.label)).toBe(
        'Visitors see: Full, set by hand · 1:24',
      );
    });
    expect(manual.result.current.trigger.tone).toBe('warning');
    expect(heard(manual.result.current.trigger.name)).toBe(
      'Visitors see: Full, set by hand, 1:24 left — change it',
    );
    expect(heard(manual.result.current.panel.now)).toBe('Now: Full, set by hand · 1:24 left');
    expect(manual.result.current.panel.back?.label).toBe('Back to the automatic status');
  });

  it('sets the chosen state for each duration, takes the answer, and returns to automatic', async () => {
    const { result, requests } = renderControl((request) =>
      request.method === 'put' ? ok(overridden()) : ok(AUTOMATIC),
    );
    await waitFor(() => {
      expect(result.current.trigger.word).toBe('Available');
    });
    act(() => {
      result.current.setOpen(true);
      result.current.panel.choose('FULL');
    });
    expect(result.current.panel.state).toBe('FULL');
    expect(result.current.panel.durations.map(({ label }) => label)).toEqual([
      '30 min',
      '1 hour',
      '2 hours',
      'Until closing',
    ]);

    for (const duration of result.current.panel.durations) {
      await act(async () => {
        await duration.run();
      });
    }

    const puts = requests.filter(({ method }) => method === 'put');
    expect(puts.map(({ url }) => url)).toEqual(
      OVERRIDE_DURATIONS.map(() => '/manage/spaces/7/status-override'),
    );
    expect(puts.map(bodyOf)).toEqual(
      OVERRIDE_DURATIONS.map((duration) => ({ state: 'FULL', duration })),
    );
    expect(result.current.trigger.word).toBe('Full');
    expect(result.current.open).toBe(false);

    await act(async () => {
      await result.current.panel.back?.run();
    });
    expect(requests.at(-1)).toMatchObject({
      method: 'delete',
      url: '/manage/spaces/7/status-override',
    });
    expect(result.current.trigger.word).toBe('Available');
  });

  it('is disabled with its reason while the space is closed, and says SPACE_NOT_OPEN in the panel', async () => {
    const closed = renderControl(() => ok({ ...AUTOMATIC, status: 'CLOSED' }));
    await waitFor(() => {
      expect(closed.result.current.trigger.word).toBe('Closed now');
    });
    expect(closed.result.current.trigger).toMatchObject({
      disabled: true,
      reason: 'The status can’t be set while the space is closed.',
      tone: 'neutral',
    });
    closed.unmount();
    restoreTransport();

    const refusing = renderControl((request) =>
      request.method === 'put'
        ? refused(409, { type: 'conflict', code: 'SPACE_NOT_OPEN' })
        : ok(AUTOMATIC),
    );
    await waitFor(() => {
      expect(refusing.result.current.trigger.disabled).toBe(false);
    });
    act(() => {
      refusing.result.current.setOpen(true);
    });
    await act(async () => {
      await refusing.result.current.panel.durations[0]?.run();
    });

    expect(refusing.result.current.open).toBe(true);
    expect(refusing.result.current.panel.failure).toMatchObject({
      kind: 'refused',
      title: 'We couldn’t set the status',
      message:
        'The status can’t be set now: the space is closed, outside its hours, or has no active owner.',
    });
  });

  it('reads «No live status» for a space with none', async () => {
    const { result } = renderControl(() => ok({ ...AUTOMATIC, status: null, capacity: null }));

    await waitFor(() => {
      expect(heard(result.current.trigger.label)).toBe('Visitors see: No live status');
    });
    expect(result.current.trigger.tone).toBe('neutral');
  });
});
