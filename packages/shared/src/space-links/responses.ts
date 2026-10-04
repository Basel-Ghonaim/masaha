/** One of the user's active links to a space, and their role there (ADR 0009). */
export interface SessionSpaceLink {
  spaceId: number;
  role: 'OWNER' | 'RECEPTION';
}
