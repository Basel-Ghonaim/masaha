import type { StaffMember } from '@masaha/shared/space-links';
import type { BadgeProps } from '@shared/design-system';

/** A badge as a row shows it: its words and its variant. */
export type BadgeView = { label: string; variant: NonNullable<BadgeProps['variant']> };

/** One staff member's row, ready to render: their name, their email, their badges, and the person. */
export type StaffRowView = {
  key: number;
  name: string;
  email: string;
  badges: BadgeView[];
  /** When the person was added, a Gaza date with its year. */
  added: string;
  /** What they collected this month («—» unread), and the ledger of it. */
  collected: { amount: string; href: string };
  /** The person as the server answered, for the row's actions. */
  member: StaffMember;
};
