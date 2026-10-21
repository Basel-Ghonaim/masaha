import type { StaffMember } from '@masaha/shared/space-links';

/** The dialog a staff member's menu opens, for the person whose row opened it. */
export type StaffDialog = { kind: 'deactivate' | 'reissue'; member: StaffMember };
