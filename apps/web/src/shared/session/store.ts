import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type {
  Session,
  SessionEstablishedListener,
  SessionSource,
  SessionState,
  UnreachableReason,
} from './model';

// The raw store never leaves this file: reads go through getSession and useSession, and the writers
// below are the only way to change it.
const store = createStore<SessionState>()(() => ({
  status: 'restoring',
  user: null,
  accessToken: null,
}));

const establishedListeners = new Set<SessionEstablishedListener>();
const endedListeners = new Set<() => void>();

// Advanced each time a session ends, so an operation that started before can tell that its answer
// belongs to a session that is gone.
let generation = 0;

/** Which session this is; it changes each time a session ends. */
export function sessionGeneration(): number {
  return generation;
}

/**
 * Runs each listener on its own. A listener that throws never undoes the transition the store has
 * made, nor stops the other listeners; its error is logged with console.error, not thrown.
 */
function notify<A extends unknown[]>(listeners: Set<(...args: A) => void>, ...args: A): void {
  for (const listener of listeners) {
    try {
      listener(...args);
    } catch (error) {
      console.error(error);
    }
  }
}

/** The session now, for code that is not a component. */
export function getSession(): SessionState {
  return store.getState();
}

/** A selected part of the session; the component renders again only when that value changes. */
export function useSession<T>(select: (session: SessionState) => T): T {
  return useStore(store, select);
}

/**
 * Holds a session the server issued, as it sent it, then tells the listeners how it arrived. A
 * sign-in hands its answer here with `source: 'signIn'`; a restore or a refresh, with `'restore'`.
 */
export function establishSession(session: Session, { source }: { source: SessionSource }): void {
  store.setState(
    { status: 'authenticated', user: session.user, accessToken: session.accessToken },
    true,
  );
  notify(establishedListeners, session, { source });
}

/** Runs `listener` each time a session is established; returns what stops it. */
export function onSessionEstablished(listener: SessionEstablishedListener): () => void {
  establishedListeners.add(listener);
  return () => {
    establishedListeners.delete(listener);
  };
}

/** Runs `listener` each time a session that was held ends; returns what stops it. */
export function onSessionEnded(listener: () => void): () => void {
  endedListeners.add(listener);
  return () => {
    endedListeners.delete(listener);
  };
}

/**
 * The password of user `userId` was changed: their session goes on with the access token the
 * server renewed, and no change pending. Only that user's session, still held, is changed: a
 * sign-out answered first stays signed out, and another user who signed in meanwhile keeps their
 * own token. The session is the same one, so no listener is told.
 */
export function passwordChanged(userId: number, accessToken: string): void {
  const session = store.getState();
  if (session.status !== 'authenticated' || session.user.id !== userId) {
    return;
  }
  store.setState(
    { status: 'authenticated', accessToken, user: { ...session.user, mustChangePassword: false } },
    true,
  );
}

export function markRestoring(): void {
  store.setState({ status: 'restoring', user: null, accessToken: null }, true);
}

export function markUnreachable(reason: UnreachableReason): void {
  store.setState({ status: 'unreachable', reason, user: null, accessToken: null }, true);
}

/**
 * No session. The ended listeners run only when a session was held, so a restore that finds none
 * ends nothing.
 */
export function endSession(): void {
  const held = store.getState().user !== null;
  generation += 1;
  store.setState({ status: 'anonymous', user: null, accessToken: null }, true);
  if (held) {
    notify(endedListeners);
  }
}
