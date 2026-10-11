/** The dashboard's shell: its sidebar, for a space and for the platform, and its pages' titles. */
export const DASHBOARD = {
  /** Names a space's sidebar, and its drawer on a phone. */
  spaceNavigation: 'Space dashboard',
  /** Names the admin's sidebar, and its drawer on a phone. */
  adminNavigation: 'Platform admin',
  /** The admin's sidebar header, under the wordmark. */
  platformAdmin: 'Platform admin',
  /** Opens the sidebar's drawer on a phone. */
  menu: 'Menu',
  /** The sidebar's foot: the space's page on the public site. */
  publicPage: 'View public page',
  /** The pages, as the navigation lists them; each is also the title of the page it opens. */
  pages: {
    overview: 'Overview',
    desk: 'Front desk',
    customers: 'Customers',
    payments: 'Payments',
    myPayments: 'My payments today',
    finance: 'Finance & reports',
    packages: 'Packages & prices',
    profile: 'Space profile',
    announcements: 'Announcements',
    dataReports: 'Data reports',
    staff: 'Staff',
    settings: 'Settings',
    spaces: 'Spaces',
    owners: 'Space owners',
    users: 'Users',
    lookups: 'Lookups',
    audit: 'Audit log',
  },
  /** The admin's add-space page, reached from the spaces list: never a sidebar item. */
  addSpace: {
    title: 'Add space',
    /** Names the trail back to the spaces list. */
    trail: 'Breadcrumb',
  },
} as const;
