import { createSpaceSchema, type CreateSpaceRequest } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { profileInput } from '../../services/profileInput';
import type { ProfileValues } from '../../types/ProfileValues';
import { PROFILE_FIELDS } from '../profileFieldOrder';
import { useProfileFields } from '../useProfileFields';
import { useCreateSpace } from './useCreateSpace';

const EMPTY: ProfileValues = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  areaId: null,
  addressAr: '',
  addressEn: '',
  landmarkAr: '',
  landmarkEn: '',
  location: '',
};

/**
 * The add-space form, ready to render: a space's basics and its location, checked in the browser by
 * the contract's schema and sent once. Once the space is created and the admin's lists have been
 * fetched again, the spaces list the page left included, a toast names it and `onCreated` runs.
 */
export function useAddSpaceForm({ onCreated }: { onCreated: () => void }) {
  const words = useCopy().spaces.add;
  const create = useCreateSpace();
  const form = useServerForm<ProfileValues, CreateSpaceRequest>({
    schema: createSpaceSchema,
    defaultValues: EMPTY,
    fields: PROFILE_FIELDS,
    prepare: profileInput,
    submit: async (request) => {
      await create.mutateAsync(request);
      onCreated();
    },
    failureTitle: words.failureTitle,
    fieldLines: words.fieldErrors,
    failureLines: { conflict: words.conflict },
  });
  const view = useProfileFields(form);

  return {
    ...view,
    submit: form.submit,
    isPending: form.isPending,
    blocked: form.blocked,
    failure: form.failure,
    submitLabel: words.submit,
  };
}
