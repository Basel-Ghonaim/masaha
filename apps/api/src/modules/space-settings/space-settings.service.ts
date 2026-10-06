import type { Tx } from '../../db/index.ts';
import {
  createSpaceSettingsRepository,
  type InitialSpaceSettings,
} from './space-settings.repository.ts';

/**
 * A space's settings, one row per space (docs/backend/conventions.md › space-settings). So far only
 * the row's creation, which the space's creation calls in its own transaction.
 */
export function createSpaceSettingsService() {
  const repository = createSpaceSettingsRepository();
  return {
    /** The space's settings row, with these values; in the caller's transaction. */
    createFor(spaceId: number, settings: InitialSpaceSettings, tx: Tx): Promise<void> {
      return repository.create(spaceId, settings, tx);
    },
  };
}

export type SpaceSettingsService = ReturnType<typeof createSpaceSettingsService>;
