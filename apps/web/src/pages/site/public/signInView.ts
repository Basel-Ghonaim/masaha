/** What a guest pressed that needs an account. */
export type SignInReason = 'favorite' | 'report';

/**
 * The views of the sign-in over the page (ADR 0021): signing in, registering, asking for a reset
 * link, and the sign-in again once a reset completed in another tab (A1).
 */
export type SignInView = 'signIn' | 'register' | 'forgot' | 'changed';

/** Where the forgotten password's view stands: the server's step, or its read. */
export type ForgotStep = 'loading' | 'unreachable' | 'request' | 'sent' | 'linkOpen';

/** Where the focus goes as a view opens: its title, or its form's first field to fill. */
export type ViewFocus = 'title' | 'form';
