import type { BadgeProps } from '@shared/design-system';
import type { ReactNode } from 'react';

/** A badge as a row shows it: its words and its variant. */
export type BadgeView = { label: string; variant: NonNullable<BadgeProps['variant']> };

/** One staff member's row, ready to render: their name, their email, their badges, their actions. */
export type StaffRowView = {
  key: number;
  name: string;
  email: string;
  badges: BadgeView[];
  /** The row's actions, drawn by the list in the last column and at a card's end. */
  actions?: ReactNode;
};
