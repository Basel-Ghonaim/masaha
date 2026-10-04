/** The global role (ADR 0002). */
export type Role = 'USER' | 'OWNER' | 'ADMIN';

/** What a password change answers, beside a new refresh cookie: the session goes on, renewed. */
export interface PasswordChanged {
  accessToken: string;
}
