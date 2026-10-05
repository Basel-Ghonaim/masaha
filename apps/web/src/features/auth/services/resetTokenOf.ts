/**
 * The token of a reset link, from the fragment it rides in (`#token=…`), where no server ever
 * receives it. Nothing when the fragment carries none; an empty token is still the link's, for the
 * check to refuse.
 */
export function resetTokenOf(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token');
}
