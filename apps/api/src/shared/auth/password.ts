import bcrypt from 'bcrypt';

// docs/backend/security.md › Passwords. Hash outside database transactions: it takes a while.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}
