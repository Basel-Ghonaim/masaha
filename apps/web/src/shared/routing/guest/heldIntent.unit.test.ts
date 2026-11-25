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
  heldIntentPreview,
  holdIntent,
  noteRecoveryDone,
  onIntentConfirmed,
  renewHeldIntent,
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
  it('is kept in the browser’s storage, never anywhere else, with the mark of the tab that held it', () => {
    holdIntent(REPORT);

    const { tab, ...held } = JSON.parse(items.get(KEY) ?? 'null') as { tab: unknown };
    expect(held).toEqual({ ...REPORT, at: Date.parse('2026-10-29T09:00:00Z') });
    expect(typeof tab).toBe('string');
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

describe('the held intent read without taking it', () => {
  it('is the action held, left in the storage', () => {
    holdIntent(REPORT);

    expect(heldIntentPreview()).toMatchObject(REPORT);
    expect(items.has(KEY)).toBe(true);
  });

  it.each([
    ['none is held', () => undefined],
    [
      'its life is over',
      () => {
        heldElsewhere(Date.now() - HELD_INTENT_MS - 1);
      },
    ],
    ['the storage holds something else', () => items.set(KEY, '{"kind":"report"}')],
    ['the storage holds no JSON', () => items.set(KEY, 'not json')],
  ])('is nothing when %s', (_case, arrange) => {
    arrange();

    expect(heldIntentPreview()).toBeNull();
  });
});

describe('renewing the held intent', () => {
  it('starts its life again from now', () => {
    // Two minutes left of its life; one passes before the renewal.
    heldElsewhere(Date.now() - HELD_INTENT_MS + 120_000);
    vi.advanceTimersByTime(60_000);

    renewHeldIntent();

    expect(JSON.parse(items.get(KEY) ?? 'null')).toEqual({ ...REPORT, at: Date.now() });
    vi.advanceTimersByTime(HELD_INTENT_MS - 1);
    expect(heldIntentPreview()).toMatchObject(REPORT);
  });

  it.each([
    ['none is held', () => undefined],
    [
      'its life is already over',
      () => {
        heldElsewhere(Date.now() - HELD_INTENT_MS - 1);
      },
    ],
  ])('holds nothing when %s', (_case, arrange) => {
    arrange();
    const before = items.get(KEY);

    renewHeldIntent();

    expect(items.get(KEY)).toBe(before);
    expect(heldIntentPreview()).toBeNull();
  });
});

describe('the held intent’s page', () => {
  it.each([
    ['a host after two slashes', '//evil.example/spaces'],
    ['a host after a backslash', '/\\evil.example'],
    ['a host once the dots are resolved', '/.//evil.example'],
    ['a full address', 'https://evil.example/'],
  ])('is refused when it leaves the site: %s', (_case, path) => {
    items.set(KEY, JSON.stringify({ ...REPORT, path, at: Date.now() }));
    noteRecoveryDone();

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(takeIntentPath()).toBeNull();
  });

  it('is kept as written when it is a page of the site, with its search', () => {
    const path = '/spaces?area=gaza-city';
    items.set(KEY, JSON.stringify({ ...REPORT, path, at: Date.now() }));

    expect(heldIntentPreview()?.path).toBe(path);
  });
});

describe('the tab that held it (S-2)', () => {
  it('runs nothing stored by another tab over this tab’s hold, for a sign-in here without a recovery', () => {
    holdIntent(REPORT);
    // Another tab of this browser holds its own action over it.
    items.set(
      KEY,
      JSON.stringify({
        ...REPORT,
        slug: 'old-hub',
        path: '/spaces/old-hub',
        at: Date.now(),
        tab: 'another',
      }),
    );

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([]);
    expect(takeIntentPath()).toBeNull();
  });

  it('runs this tab’s own hold for its sign-in', () => {
    holdIntent(REPORT);

    establishSession(aSession(), { source: 'signIn' });

    expect(ran).toEqual([expect.objectContaining(REPORT)]);
  });

  it('previews only this tab’s hold when asked for it, any tab’s otherwise', () => {
    items.set(KEY, JSON.stringify({ ...REPORT, at: Date.now(), tab: 'another' }));

    expect(heldIntentPreview('tab')).toBeNull();
    expect(heldIntentPreview()).toMatchObject(REPORT);

    holdIntent(REPORT);
    expect(heldIntentPreview('tab')).toMatchObject(REPORT);
  });
});

describe('the held page, read as `next` is (N-2)', () => {
  it('is the path `returnUrlOf` yields, not the string stored', () => {
    items.set(KEY, JSON.stringify({ ...REPORT, path: '/spaces/./noor-hub', at: Date.now() }));
    noteRecoveryDone();

    expect(heldIntentPreview()?.path).toBe('/spaces/noor-hub');
    establishSession(aSession(), { source: 'signIn' });
    expect(takeIntentPath()).toBe('/spaces/noor-hub');
  });
});
