// The sign-in's code, built into a chunk of its own: vite.config.ts makes it, and check:build holds
// it out of the site's first download and off the public pages and the site's shell, which load it
// only when a guest's action opens the sign-in over the page (ADR 0021, point 6). The one place
// both read.

/** The chunk of `features/auth`: its forms, its hooks, its repositories and Google's loader. */
export const SIGN_IN_CHUNK = {
  name: 'sign-in',
  test: /(?:^|[\\/])src[\\/]features[\\/]auth[\\/]/,
} as const;

/**
 * The site's modules whose chunks must not reach it through their static imports: its public pages
 * and its shell. The auth pages and the account's settings load it by design.
 */
export const SIGN_IN_FREE = /^src\/pages\/site\/(?:public|shell)\//;
