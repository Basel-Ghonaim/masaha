import type {
  PlatformContact,
  PlatformContactRequest,
  StalenessRequest,
  StalenessThresholds,
} from '@masaha/shared/platform-settings';
import type { NewSpaceDefaults } from '@masaha/shared/space-settings';
import { api } from '@shared/api';

/** The admin's settings, one resource per card, below the admin's path. */
const ADMIN_SETTINGS_PATH = '/admin/settings';

/**
 * The platform's settings on the server (docs/api/api-contract.md › Platform settings): the admin's
 * three cards, each read and saved whole and on its own.
 */
export interface PlatformSettingsRepository {
  contact(): Promise<PlatformContact>;
  /** Saves the contact whole, `null` clearing a channel; the answer is as saved (normalised). */
  saveContact(request: PlatformContactRequest): Promise<PlatformContact>;
  staleness(): Promise<StalenessThresholds>;
  saveStaleness(request: StalenessRequest): Promise<StalenessThresholds>;
  defaults(): Promise<NewSpaceDefaults>;
  saveDefaults(request: NewSpaceDefaults): Promise<NewSpaceDefaults>;
}

export function createPlatformSettingsRepository(): PlatformSettingsRepository {
  return {
    contact: () => api.get<PlatformContact>(`${ADMIN_SETTINGS_PATH}/contact`),
    saveContact: (request) => api.put<PlatformContact>(`${ADMIN_SETTINGS_PATH}/contact`, request),
    staleness: () => api.get<StalenessThresholds>(`${ADMIN_SETTINGS_PATH}/staleness`),
    saveStaleness: (request) =>
      api.put<StalenessThresholds>(`${ADMIN_SETTINGS_PATH}/staleness`, request),
    defaults: () => api.get<NewSpaceDefaults>(`${ADMIN_SETTINGS_PATH}/new-space-defaults`),
    saveDefaults: (request) =>
      api.put<NewSpaceDefaults>(`${ADMIN_SETTINGS_PATH}/new-space-defaults`, request),
  };
}
