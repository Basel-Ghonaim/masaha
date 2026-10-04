import { createSessionRepository, type SessionRepository } from './sessionRepository';
import { cookieSessionHint, type SessionHint } from './sessionHint';

/** What the session's operations reach outside the page: the server's calls and the hint. */
export type SessionDependencies = { repository: SessionRepository; hint: SessionHint };

/** The app's: the calls through the one client, and the hint in the browser's cookies. */
export const appDependencies: SessionDependencies = {
  repository: createSessionRepository(),
  hint: cookieSessionHint,
};
