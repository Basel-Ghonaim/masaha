/**
 * An address as a recovery shows it (docs/backend/security.md › Passwords): the first character of
 * its local part, then a mask, then the domain, so its holder recognises it and no one else learns
 * it. `sara@example.com` → `s•••@example.com`.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  const [first = ''] = Array.from(email.slice(0, at));
  return `${first}•••${email.slice(at)}`;
}
