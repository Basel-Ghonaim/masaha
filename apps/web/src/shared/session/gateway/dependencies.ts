import { createSessionEndpoints, type SessionEndpoints } from './endpoints';
import { cookieSessionHint, type SessionHint } from './sessionHint';

/** What the session's operations reach outside the page: the server's endpoints and the hint. */
export type SessionDependencies = { endpoints: SessionEndpoints; hint: SessionHint };

/** The app's: the endpoints through the one client, and the hint in the browser's cookies. */
export const appDependencies: SessionDependencies = {
  endpoints: createSessionEndpoints(),
  hint: cookieSessionHint,
};
