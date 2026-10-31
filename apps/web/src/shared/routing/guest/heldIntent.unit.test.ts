import { establishSession, refreshSession } from '@shared/session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { stubLocalStorage } from '../../../test/fakeStorage';
import { fakeTransport, refused, restoreTransport } from '../../../test/fakeTransport';
import { setSessionHint, stubCookies } from '../../../test/sessionHint';
import {
  HELD_INTENT_MS,
  dropHeldIntent,
  holdIntent,
  onIntentConfirmed,
  takeIntentPath,
  type HeldIntent,
} from './heldIntent';

const KEY = 'masaha.heldIntent';
const REPORT = { kind: 'report', slug: 'noor-hub', path: '/spaces/noor-hub' } as const;

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
});
