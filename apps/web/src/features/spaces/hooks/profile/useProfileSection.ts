import {
  createSpaceSchema,
  type AdminSpace,
  type CreateSpaceRequest,
  type FactGroup,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useEffect, useRef, useState } from 'react';
import type { EditorPlace } from '../../types/EditorPlace';
import { profileChanges, profileOf, type SpaceProfile } from '../../services/profileChanges';
import { profileEditInput } from '../../services/profileEditInput';
import { profileValues } from '../../services/profileValues';
import type { ProfileValues } from '../../types/ProfileValues';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSectionFrame } from '../editor/useSectionFrame';
import { PROFILE_FIELDS } from '../profileFieldOrder';
import { useProfileFields } from '../useProfileFields';

/**
 * The editor's «المساحة» section, ready to render: the space's basics and location as one form,
 * checked by the contract's schema, around its frame. A save sends only the fields the admin changed
 * since the form was last filled from the space, a cleared one as `null`, and nothing at all when none
 * did, so a field another admin changed meanwhile is never sent back. While the section is unchanged
 * it follows the space as the server answers it; once saved, it holds the server's answer.
 */
export function useProfileSection({
  place,
  space,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const copy = useCopy();
  const scope = EDITOR_SCOPES[place];
  const { repository } = scope;
  const words = copy.spaces.add;
  const section = copy.spaces.editor.section;
  const save = useSaveGroup(
    place,
    space.id,
    'profile',
    (request: Parameters<typeof repository.updateProfile>[1]) =>
      repository.updateProfile(space.id, request),
  );
  const [unchanged, setUnchanged] = useState(false);
  // The profile the form was last filled from: a save's changes are the admin's own against it.
  const profile = profileOf(space);
  const filledFrom = useRef(profile);
  const saved = profileValues(profile);
  const form = useServerForm<ProfileValues, CreateSpaceRequest>({
    schema: createSpaceSchema,
    defaultValues: saved,
    fields: PROFILE_FIELDS,
    prepare: profileEditInput,
    submit: async (request) => {
      const changes = profileChanges(request, filledFrom.current);
      if (Object.keys(changes).length === 0) {
        setUnchanged(true);
        filledFrom.current = profile;
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      const answer = await save.mutateAsync(changes);
      filledFrom.current = profileOf(answer);
      form.form.reset(profileValues(answer));
    },
    failureTitle: section.failureTitle({ section: copy.spaces.editor.sections.profile }),
    fieldLines: words.fieldErrors,
    failureLines: meanwhileLines(place, copy),
  });
  const { isDirty } = form.form.formState;
  const profileKey = JSON.stringify(profile);

  // An unchanged section follows the space as the server answers it.
  useEffect(() => {
    if (!form.form.formState.isDirty) {
      const fresh = JSON.parse(profileKey) as SpaceProfile;
      filledFrom.current = fresh;
      form.form.reset(profileValues(fresh));
    }
  }, [profileKey, form.form]);

  const frame = useSectionFrame({
    place,
    space,
    group: 'profile',
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty,
      discard: () => {
        filledFrom.current = profile;
        setUnchanged(false);
        form.form.reset(saved);
      },
      unchanged,
    },
    onDirtyChange,
  });

  return { frame, fields: useProfileFields(form) };
}
