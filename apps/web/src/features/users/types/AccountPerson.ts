/**
 * The person whose account the admin acts on, as the page maps them from the users list's row:
 * whether they sign in with a password, own spaces, or work a front desk.
 */
export type AccountPerson = {
  id: number;
  name: string;
  email: string;
  isSuspended: boolean;
  hasPassword: boolean;
  ownsSpaces: boolean;
  atDesk: boolean;
};
