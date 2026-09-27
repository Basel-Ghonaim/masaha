/**
 * Throws unless `name` is a test database. The API test lane migrates and truncates its database,
 * so a misconfigured TEST_DATABASE_URL must never reach masaha_dev or anything else.
 */
export function assertTestDatabase(name: string): void {
  if (name.endsWith('_test')) return;
  throw new Error(
    `Refusing to migrate or truncate the database "${name}": the API test lane only touches a ` +
      'database whose name ends in _test. Check TEST_DATABASE_URL in apps/api/.env.',
  );
}
