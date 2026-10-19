/** One person offered in the link dialog's combobox: their name, their email and what they are. */
export type PersonChoiceView = {
  value: string;
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'OWNER';
  /** «مالك · {spaces}», «مالك», or «مستخدم». */
  kind: string;
};
