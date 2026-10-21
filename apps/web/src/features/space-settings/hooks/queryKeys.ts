/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const spaceSettingsKeys = {
  /** The space's eight settings. */
  settings: (spaceId: number) => ['space', spaceId, 'space-settings'] as const,
};
