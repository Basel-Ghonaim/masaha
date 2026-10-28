import { FlagIcon, type IconProps } from '@shared/design-system';
import type { ComponentType } from 'react';
import type { AccountMenuLink } from '../hooks/useAccount';

/** Each account page's icon, beside its link in the account menu and its phone section. */
export const ACCOUNT_LINK_ICONS: Record<AccountMenuLink['key'], ComponentType<IconProps>> = {
  reports: FlagIcon,
};
