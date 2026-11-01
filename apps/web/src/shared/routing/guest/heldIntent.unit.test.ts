import { establishSession, refreshSession } from '@shared/session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { stubLocalStorage } from '../../../test/fakeStorage';
import { fakeTransport, refused, restoreTransport } from '../../../test/fakeTransport';
import { setSessionHint, stubCookies } from '../../../test/sessionHint';
import {
  HELD_INTENT_MS,
  RECOVERY_ROUND_TRIP_MS,
  dropHeldIntent,
  holdIntent,
  noteRecoveryDone,
  onIntentConfirmed,
  takeIntentPath,
  type HeldIntent,
} from './heldIntent';

const KEY = 'masaha.heldIntent';
const RECOVERED = 'masaha.recoveredAt';

const REPORT = { kind: 'report', slug: 'noor-hub', path: '/spaces/noor-hub' } as const;

/** What another tab of this browser held: the intent in the storage, no hold in this tab. */
const heldElsewhere = (at = Date.now()) => {
  items.set(KEY, JSON.stringify({ ...REPORT, at }));
};

let items: Map<string, string>;
let ran: HeldIntent[];

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-29T09:00:00Z') });
  items = stubLocalStorage();
  ran = [];
  onIntentConfirmed('report', (intent) => ran.push(intent));
});

afterEach(() => {
  dropHeldIntent();
  takeIntentPath();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the held intent', () => {
  it('is kept in the browser’s storage, never anywhere else', () => {
    holdIntent(REPORT);

    expect(JSON.parse(items.get(KEY) ?? 'null')).toEqual({
      ...REPORT,
      at: Date.parse('2026-10-29T09:00:00Z'),
    });
  });

  it('runs once a sign-in confirms it, and leads back to its page', () => {
    holdIntent(REPORT);

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([expect.objectContaining(REPORT)]);
    expect(items.has(KEY)).toBe(false);
    expect(takeIntentPath()).toBe('/spaces/noor-hub');
    expect(takeIntentPath()).toBeNull();
  });

  it('is dropped once older than 15 minutes', () => {
    holdIntent(REPORT);
    vi.advanceTimersByTime(HELD_INTENT_MS + 1);

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(items.has(KEY)).toBe(false);
    expect(takeIntentPath()).toBeNull();
  });

  it('is never run by a restore or a refresh', () => {
    holdIntent(REPORT);

    establishSession(aSession(), { source: 'restore' });

    expect(ran).toEqual([]);
    expect(items.has(KEY)).toBe(true);
  });

  it('is let go when the session ends', async () => {
    stubCookies();
    establishSession(aSession(), { source: 'restore' });
    setSessionHint(true);
    holdIntent(REPORT);
    fakeTransport(() => refused(401, { type: 'unauthorized' }));

    await refreshSession().catch(() => undefined);

    restoreTransport();
    expect(items.has(KEY)).toBe(false);
  });

  it('ignores what is not an intent', () => {
    items.set(KEY, JSON.stringify({ kind: 'report', slug: 'x', path: '//evil.example', at: 1 }));

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(takeIntentPath()).toBeNull();
  });

  it('is dropped, never run, by another tab’s sign-in that follows no recovery', () => {
    heldElsewhere();

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(items.has(KEY)).toBe(false);
    expect(takeIntentPath()).toBeNull();
  });

  it('is dropped on a later visit: a new tab’s sign-in within its 15 minutes runs nothing', () => {
    heldElsewhere();
    vi.advanceTimersByTime(10 * 60 * 1000);

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(items.has(KEY)).toBe(false);
  });

  it('runs once for the sign-in after a password reset completed in this browser', () => {
    heldElsewhere();
    noteRecoveryDone();

    establishSession(aSession(), { source: 'signIn' });
    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([expect.objectContaining(REPORT)]);
    expect(takeIntentPath()).toBe('/spaces/noor-hub');
    expect(items.has(KEY)).toBe(false);
    expect(items.has(RECOVERED)).toBe(false);
  });

  it('is dropped when the reset was too long before the sign-in', () => {
    heldElsewhere();
    noteRecoveryDone();
    vi.advanceTimersByTime(RECOVERY_ROUND_TRIP_MS + 1);

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(items.has(KEY)).toBe(false);
  });

  it('a sign-in with nothing held lets a reset’s mark go too', () => {
    noteRecoveryDone();

    establishSession(aSession(), { source: 'signIn' });
    heldElsewhere();
    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
  });
});
