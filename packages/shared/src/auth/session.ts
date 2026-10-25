// The session's rules both sides know (docs/backend/security.md › Tokens and cookies).

/**
 * A reception session ends after this many minutes with no request (reception only: no owner link,
 * not the admin). Polling the desk's state is not a request that counts.
 */
export const RECEPTION_IDLE_MINUTES = 15;
