import bcrypt from 'bcrypt';

// docs/backend/security.md › Passwords. Hash outside database transactions: it takes a while.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Compared against when an account has no password to check, so an unknown email takes as long to
// refuse as a wrong password, and the timing does not tell which accounts exist.
let unmatchableHash: Promise<string> | undefined;

/** Whether `password` matches `hash`. Without a hash it still spends a comparison, and fails. */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (hash) return bcrypt.compare(password, hash);
  unmatchableHash ??= hashPassword('no account has this password 0');
  await bcrypt.compare(password, await unmatchableHash);
  return false;
}
