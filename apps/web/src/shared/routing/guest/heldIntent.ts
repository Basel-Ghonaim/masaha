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

type Runner = (intent: HeldIntent) => void;

// Each kind's runner, which the feature that holds it registers; and the intent a sign-in confirmed
// before its runner was loaded (the site's pages load lazily), handed over once it registers.
const runners = new Map<HeldIntent['kind'], Runner>();
let confirmed: HeldIntent | null = null;
// Where the app goes once a sign-in confirmed an intent, until the site's shell has gone there.
let returnTo: string | null = null;

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
  storage.write(STORAGE_KEYS.heldIntent, JSON.stringify({ ...action, at: Date.now() }));
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

// Only a sign-in in this browser confirms the stored intent (D9.6): a restore or a refresh never
// runs it. A sign-out lets it go.
onSessionEstablished((_session, { source }) => {
  if (source !== 'signIn') return;
  const intent = takeStored(Date.now());
  if (intent === null) return;
  returnTo = intent.path;
  const run = runners.get(intent.kind);
  if (run === undefined) confirmed = intent;
  else run(intent);
});
onSessionEnded(dropHeldIntent);
