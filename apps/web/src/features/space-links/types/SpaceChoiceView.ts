import type { BadgeView, SpaceNameView } from './AdminSpaceRowView';

/** One space offered in the add-owner sheet's or the link dialog's combobox, in the interface's language. */
export type SpaceChoiceView = {
  value: string;
  id: number;
  name: SpaceNameView;
  badges: BadgeView[];
  owners: string;
  isVerified: boolean;
  /** Already the person's: offered, but not to be chosen. */
  linked: boolean;
};
