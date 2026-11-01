import type { PlatformContact } from '@masaha/shared/platform-settings';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createPlatformSettingsRepository } from '../repository/platformSettingsRepository';
import { contactOf } from '../services/platformContact';
import type { PlatformChannel } from '../types/PlatformChannel';
import { platformSettingsKeys } from './queryKeys';

const repository = createPlatformSettingsRepository();

/** As long as the server's own cache (`Cache-Control: max-age=300`): a contact changes rarely. */
const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * The platform's contact the site draws (D6.3), read from `GET /settings/public`: `loading` until
 * it answers (DI31: nothing drawn meanwhile), then its valid channels, WhatsApp first — none when
 * none is set or the read failed, so the caller's own line shows.
 */
export function usePlatformContact():
  { state: 'loading' } | { state: 'ready'; channels: PlatformChannel[] } {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<PlatformContact, AppError>({
    queryKey: platformSettingsKeys.publicContact,
    queryFn: () => repository.publicContact(),
    staleTime: FIVE_MINUTES,
  });
  if (result.isPending) return { state: 'loading' };
  return { state: 'ready', channels: result.data === undefined ? [] : contactOf(result.data) };
}
