import type { SpaceSettings, UpdateSpaceSettingsRequest } from '@masaha/shared/space-settings';
import { useLinkEnded } from '@shared/api';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSpaceSettingsRepository } from '../repository/spaceSettingsRepository';
import { spaceSettingsKeys } from './queryKeys';

const repository = createSpaceSettingsRepository();

/**
 * Saves some of the space's settings, from one card: the answer is the settings as they now are,
 * kept as the query's, and a toast names the card (`card`).
 */
export function useSaveSettings(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<
    SpaceSettings,
    AppError,
    { request: UpdateSpaceSettingsRequest; card: string }
  >({
    mutationFn: ({ request }) => repository.update(spaceId, request),
    onSuccess: (answer, { card }) => {
      client.setQueryData(spaceSettingsKeys.settings(spaceId), answer);
      toast(currentCopy().spaceSettings.card.saved({ card }));
    },
    onError: linkEnded,
  });
}
