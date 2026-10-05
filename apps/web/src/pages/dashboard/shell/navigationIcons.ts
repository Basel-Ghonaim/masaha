import {
  ChartColumnIcon,
  ConciergeBellIcon,
  FlagIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MegaphoneIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  StoreIcon,
  TagIcon,
  UserCogIcon,
  UsersIcon,
  type IconProps,
} from '@shared/design-system';
import type { ComponentType } from 'react';
import type { DashboardPageName } from '../navigation';

/**
 * Each page's icon in the sidebar. Kept apart from the navigation config, which the route
 * definitions read in the site's first download: the icons load with the shell.
 */
export const NAVIGATION_ICONS: Record<DashboardPageName, ComponentType<IconProps>> = {
  overview: LayoutDashboardIcon,
  desk: ConciergeBellIcon,
  customers: UsersIcon,
  payments: ReceiptIcon,
  myPayments: ReceiptIcon,
  finance: ChartColumnIcon,
  packages: TagIcon,
  profile: StoreIcon,
  announcements: MegaphoneIcon,
  dataReports: FlagIcon,
  staff: IdCardIcon,
  settings: SettingsIcon,
  spaces: StoreIcon,
  owners: UserCogIcon,
  users: UsersIcon,
  lookups: ListChecksIcon,
  audit: ScrollTextIcon,
};
