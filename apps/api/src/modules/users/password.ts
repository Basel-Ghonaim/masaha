import bcrypt from 'bcrypt';

// docs/backend/security.md › Passwords. Hash outside database transactions: it takes a while.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Compared against when an account has no password to check, so an unknown email takes as long to
// refuse as a wrong password, and the timing does not tell which accounts exist. A literal at the
// same cost, so no instance pays an extra hash on its first unknown email. Its password was random
// and is known to no one.
const UNMATCHABLE_HASH = '$2b$12$QJkHyDbU4bQMfwBZ3PYW2O4KpOZTetC6WMYqqBn4EaWSKTdRUMZhy';

/** Whether `password` matches `hash`. Without a hash it still spends a comparison, and fails. */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (hash) return bcrypt.compare(password, hash);
  await bcrypt.compare(password, UNMATCHABLE_HASH);
  return false;
}
