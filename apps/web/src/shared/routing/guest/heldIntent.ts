import { onSessionEnded, onSessionEstablished } from '@shared/session';
import { STORAGE_KEYS, storage } from '@shared/storage';

/** A space's name as the card or the page showed it, marked when not in the interface's language. */
type HeldName = { text: string; lang?: 'en'; dir?: 'ltr' };

/**
 * A guest's held action, kept in the browser's storage so a password recovery's new tab can run it
 * (finding 168): a favourite of a space, or a report on a space's page; the page it was pressed on,
 * which the app returns to; and when it was held.
 */
export type HeldIntent =
  | { kind: 'favorite'; spaceId: number; name: HeldName; path: string; at: number }
  | { kind: 'report'; slug: string; path: string; at: number };

/** What a feature holds: its intent, without the time, which the store stamps. */
export type HeldAction =
  | Omit<Extract<HeldIntent, { kind: 'favorite' }>, 'at'>
  | Omit<Extract<HeldIntent, { kind: 'report' }>, 'at'>;

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
// Whether this tab held the stored intent: a sign-in here is the round trip it serves.
let heldHere = false;

function isName(value: unknown): value is HeldName {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}

function isIntent(value: unknown): value is HeldIntent {
  if (typeof value !== 'object' || value === null) return false;
  const intent = value as Record<string, unknown>;
  const shared =
    typeof intent.path === 'string' &&
    intent.path.startsWith('/') &&
    !intent.path.startsWith('//') &&
    typeof intent.at === 'number';
  if (!shared) return false;
  if (intent.kind === 'favorite') return typeof intent.spaceId === 'number' && isName(intent.name);
  return intent.kind === 'report' && typeof intent.slug === 'string';
}

/** Whether a password reset was completed in this browser just before; the mark is removed as read. */
function takeRecovery(now: number): boolean {
  const raw = storage.read(STORAGE_KEYS.recoveredAt);
  storage.remove(STORAGE_KEYS.recoveredAt);
  const at = Number(raw);
  return raw !== null && Number.isFinite(at) && at <= now && now - at <= RECOVERY_ROUND_TRIP_MS;
}

/** The stored intent, when it is one and within its life; it is removed as it is read. */
function takeStored(now: number): HeldIntent | null {
  const raw = storage.read(STORAGE_KEYS.heldIntent);
  storage.remove(STORAGE_KEYS.heldIntent);
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isIntent(value) || value.at > now || now - value.at > HELD_INTENT_MS) return null;
  return value;
}

/**
 * Keeps a guest's held action in the browser's storage, beside the feature's own memory, so a
 * password recovery's new tab can still run it once its sign-in confirms it: never in the address.
 */
export function holdIntent(action: HeldAction): void {
  heldHere = true;
  storage.write(STORAGE_KEYS.heldIntent, JSON.stringify({ ...action, at: Date.now() }));
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
  heldHere = false;
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
// held it, or the sign-in after a password reset completed in this browser. Any other sign-in — an
// unrelated one in another tab, a later visit's — lets it go without running it; a restore or a
// refresh never runs it. A sign-out lets it go.
onSessionEstablished((_session, { source }) => {
  if (source !== 'signIn') return;
  const now = Date.now();
  const here = heldHere;
  heldHere = false;
  const recovered = takeRecovery(now);
  const intent = takeStored(now);
  if (intent === null || !(here || recovered)) return;
  returnTo = intent.path;
  const run = runners.get(intent.kind);
  if (run === undefined) confirmed = intent;
  else run(intent);
});
onSessionEnded(dropHeldIntent);
