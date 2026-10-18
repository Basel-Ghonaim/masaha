import type { SpaceNameView } from './AdminSpaceRowView';

/** Whose account an email is, as the upgrade shows it before the admin confirms. */
export type EmailAccountView = {
  name: string;
  /** When the account was created, as the lists write a date. */
  joined: string;
  /** The spaces of its active owner links, each named in the interface's language. */
  spaces: SpaceNameView[];
};

/** Reading the account an email belongs to: only an exact email match is `found`. */
export type EmailAccountState =
  | { status: 'none' }
  | { status: 'reading' }
  | { status: 'found'; account: EmailAccountView }
  | { status: 'notFound' };
