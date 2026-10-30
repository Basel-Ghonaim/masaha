/** One person offered in the link dialog's combobox: their name, their email and what they are. */
export type PersonChoiceView = {
  value: string;
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'OWNER';
  /** «مالك · {spaces}», «مالك», «مستخدم · استقبال {spaces}» or «مستخدم». */
  kind: string;
  /** The front desks they work, each name isolated and joined; none for a person who works none. */
  desks: string | null;
};
