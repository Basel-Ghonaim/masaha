import { onSessionEnded, onSessionEstablished } from '@shared/session';
import { STORAGE_KEYS, storage } from '@shared/storage';
import { returnUrlOf } from '../returnUrl';

/** A space's name as the card or the page showed it, marked when not in the interface's language. */
type HeldName = { text: string; lang?: 'en'; dir?: 'ltr' };

/**
 * A guest's held action, kept in the browser's storage so a password recovery's new tab can run it
 * (finding 168): a favourite of a space, or a report on a space's page, with the space's name, which
 * the reset link's page and the link sent say; the page it was pressed on, which the app returns to;
 * and when it was held. A report held before it carried a name has none.
 */
export type HeldIntent =
  | { kind: 'favorite'; spaceId: number; name: HeldName; path: string; at: number; tab?: string }
  | { kind: 'report'; slug: string; name?: HeldName; path: string; at: number; tab?: string };

/** What a feature holds: its intent, without the time and the tab, which the store stamps. */
export type HeldAction =
  | Omit<Extract<HeldIntent, { kind: 'favorite' }>, 'at' | 'tab'>
  | Omit<Extract<HeldIntent, { kind: 'report' }>, 'at' | 'tab'>;

/** How long a held action waits for its sign-in: the round trip it serves, no more (S14). */
export const HELD_INTENT_MS = 15 * 60 * 1000;

/**
 * How long a password reset completed in this browser lets the sign-in after it confirm the stored
 * intent: the recovery's round trip, the reset card's «تسجيل الدخول» just after it (R14-F3).
 */
export const RECOVERY_ROUND_TRIP_MS = 10 * 60 * 1000;

type Runner = (intent: HeldIntent) => void;

// Each kind's runner, which the feature that holds it registers; and the intent a sign-in confirmed
// before its runner was loaded (the site's pages load lazily), handed over once it registers.
const runners = new Map<HeldIntent['kind'], Runner>();
let confirmed: HeldIntent | null = null;
// Where the app goes once a sign-in confirmed an intent, until the site's shell has gone there.
let returnTo: string | null = null;
// This tab's own mark, stamped on the intent it holds: a sign-in here serves only its own (S-2).
const TAB = Math.random().toString(36).slice(2);

function isName(value: unknown): value is HeldName {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}

/**
 * `path` as the app goes to it, read as `next` is (`returnUrlOf`): a page of this site, never one a
 * browser would read as another host (`//host`, `/\host`, `/.//host`); nothing otherwise.
 */
function ownPage(path: unknown): string | undefined {
  return typeof path === 'string'
    ? returnUrlOf(`?${new URLSearchParams({ next: path }).toString()}`)
    : undefined;
}

function isIntent(value: unknown): value is HeldIntent {
  if (typeof value !== 'object' || value === null) return false;
  const intent = value as Record<string, unknown>;
  const shared =
    ownPage(intent.path) !== undefined &&
    typeof intent.at === 'number' &&
    (intent.tab === undefined || typeof intent.tab === 'string');
  if (!shared) return false;
  if (intent.kind === 'favorite') return typeof intent.spaceId === 'number' && isName(intent.name);
  return (
    intent.kind === 'report' &&
    typeof intent.slug === 'string' &&
    (intent.name === undefined || isName(intent.name))
  );
}

/** Whether a password reset was completed in this browser just before; the mark is removed as read. */
function takeRecovery(now: number): boolean {
  const raw = storage.read(STORAGE_KEYS.recoveredAt);
  storage.remove(STORAGE_KEYS.recoveredAt);
  const at = Number(raw);
  return raw !== null && Number.isFinite(at) && at <= now && now - at <= RECOVERY_ROUND_TRIP_MS;
}

/** The stored intent, when it is one and within its life; it is left where it is. */
function readStored(now: number): HeldIntent | null {
  const raw = storage.read(STORAGE_KEYS.heldIntent);
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isIntent(value) || value.at > now || now - value.at > HELD_INTENT_MS) return null;
  // The page as `next` reads it, the one checked, is the one followed.
  return { ...value, path: ownPage(value.path) ?? '/' };
}

/** The stored intent, when it is one and within its life; it is removed as it is read. */
function takeStored(now: number): HeldIntent | null {
  const intent = readStored(now);
  storage.remove(STORAGE_KEYS.heldIntent);
  return intent;
}

/**
 * The guest's action held in this browser, if one is, within its life, read without taking it: what
 * the link sent and the reset link's page say will complete (ADR 0021, point 4). `'tab'` reads only
 * the one this tab held, which its own sign-in would run; the reset link's page reads any. Running it
 * stays the sign-in's.
 */
export function heldIntentPreview(of: 'browser' | 'tab' = 'browser'): HeldIntent | null {
  const intent = readStored(Date.now());
  return of === 'tab' && intent?.tab !== TAB ? null : intent;
}

/**
 * Starts the held action's life again, when one is held: a reset link asked for, or asked again,
 * from the sign-in over its page, whose round trip through the email may outlast what was left of
 * it. It never holds an action that is not held.
 */
export function renewHeldIntent(): void {
  const intent = readStored(Date.now());
  if (intent !== null)
    storage.write(STORAGE_KEYS.heldIntent, JSON.stringify({ ...intent, at: Date.now() }));
}

/**
 * Keeps a guest's held action in the browser's storage, beside the feature's own memory, so a
 * password recovery's new tab can still run it once its sign-in confirms it: never in the address.
 */
export function holdIntent(action: HeldAction): void {
  storage.write(STORAGE_KEYS.heldIntent, JSON.stringify({ ...action, at: Date.now(), tab: TAB }));
}

/**
 * Marks a password reset completed in this browser (the reset page, once the password is set): the
 * sign-in that follows it, in whichever tab, is the recovery's round trip, and may run the stored
 * intent (finding 168). Short-lived, and let go by the next sign-in.
 */
export function noteRecoveryDone(): void {
  storage.write(STORAGE_KEYS.recoveredAt, String(Date.now()));
}

/** Lets the held action go: the guest closed the sign-in, left its page, or signed out. */
export function dropHeldIntent(): void {
  storage.remove(STORAGE_KEYS.heldIntent);
  confirmed = null;
  returnTo = null;
}

/**
 * Registers what runs a confirmed intent of `kind` (the feature's own hold, which its page then
 * runs); an intent confirmed before it registered is handed over at once, within its life.
 */
export function onIntentConfirmed(kind: HeldIntent['kind'], run: Runner): void {
  runners.set(kind, run);
  if (confirmed?.kind !== kind) return;
  const pending = confirmed;
  confirmed = null;
  if (Date.now() - pending.at <= HELD_INTENT_MS) run(pending);
}

/** Where the app goes for the intent a sign-in confirmed, once: the site's shell takes it. */
export function takeIntentPath(): string | null {
  const path = returnTo;
  returnTo = null;
  return path;
}

// Only the round trip it serves confirms the stored intent (D9.6, R14-F3): a sign-in in the tab that
// held it — the intent stamped with this tab's mark, not one another tab held over it since (S-2) —,
// or the sign-in after a password reset completed in this browser. Any other sign-in — an
// unrelated one in another tab, a later visit's — lets it go without running it; a restore or a
// refresh never runs it. A sign-out lets it go.
onSessionEstablished((_session, { source }) => {
  if (source !== 'signIn') return;
  const now = Date.now();
  const recovered = takeRecovery(now);
  const intent = takeStored(now);
  if (intent === null || !(intent.tab === TAB || recovered)) return;
  returnTo = intent.path;
  const run = runners.get(intent.kind);
  if (run === undefined) confirmed = intent;
  else run(intent);
});
onSessionEnded(dropHeldIntent);
