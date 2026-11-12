import {
  createSpaceSchema,
  SPACE_DESCRIPTION_MAX_LENGTH,
  type CreateSpaceRequest,
  type UpdateSpaceProfileRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { profileChanges, profileOf, type SpaceProfile } from '../../services/profileChanges';
import { profileEditInput } from '../../services/profileEditInput';
import { profileValues } from '../../services/profileValues';
import type { ProfileValues } from '../../types/ProfileValues';
import type { SectionHost } from '../../types/SectionHost';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { sectionName } from '../editor/sectionName';
import { useResetOnOpen } from '../editor/useResetOnOpen';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSheetFrame } from '../editor/useSheetFrame';
import { PROFILE_FIELDS } from '../profileFieldOrder';
import { useProfileFields } from '../useProfileFields';

/**
 * The Sheet of «عن المساحة» or «الموقع» (`part`), ready to render: the space's profile as one form,
 * checked by the contract's schema, of which the Sheet shows its own fields. They share one API
 * group, so a save sends only its own section's fields that differ from what the Sheet opened on
 * (B2/L2): never the other section's, nor a field another admin changed meanwhile, even once the
 * space is read again while the Sheet is open; one that changed nothing sends nothing, says «لم
 * يتغيّر شيء» and closes. A description's count is said live, past its limit too (DI-6).
 */
export function useProfileSheet(host: SectionHost, part: 'about' | 'location') {
  const copy = useCopy();
  const words = copy.spaces.editor;
  const { place, space } = host;
  const sheet = host.sheet(part);
  const { repository } = EDITOR_SCOPES[place];
  const title = sectionName(part, copy);
  const save = useSaveGroup(place, space.id, part, (request: UpdateSpaceProfileRequest) =>
    repository.updateProfile(space.id, request),
  );
  const about = words.about.fieldErrors;
  const location = words.location.fieldErrors;
  const fieldLines: ServerFormOptions<ProfileValues, CreateSpaceRequest>['fieldLines'] = {
    nameEn: about.nameEn,
    nameAr: about.nameAr,
    descriptionAr: about.description,
    descriptionEn: about.description,
    areaId: location.areaId,
    addressAr: location.addressAr,
    addressEn: location.addressEn,
    landmarkAr: location.landmark,
    landmarkEn: location.landmark,
    location: location.location,
  };
  // The profile the Sheet opened on: a save's changes are the user's own against it.
  const filledFrom = useRef<SpaceProfile>(profileOf(space));
  const form = useServerForm<ProfileValues, CreateSpaceRequest>({
    schema: createSpaceSchema,
    defaultValues: profileValues(profileOf(space)),
    fields: PROFILE_FIELDS,
    prepare: profileEditInput,
    submit: async (request) => {
      const changes = profileChanges(request, filledFrom.current, part);
      if (Object.keys(changes).length === 0) {
        toast(words.section.unchanged);
        sheet.close();
        return;
      }
      await save.mutateAsync(changes);
      sheet.close();
    },
    failureTitle: words.section.failureTitle({ section: title }),
    fieldLines,
    failureLines: meanwhileLines(place, copy),
  });
  useResetOnOpen(sheet.open, () => {
    filledFrom.current = profileOf(space);
    form.form.reset(profileValues(filledFrom.current));
  });
  const frame = useSheetFrame({
    host: sheet,
    title: part === 'about' ? words.about.sheetTitle : words.location.sheetTitle,
    description: null,
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty: form.form.formState.isDirty,
    },
  });
  const [descriptionAr, descriptionEn] = useWatch({
    control: form.form.control,
    name: ['descriptionAr', 'descriptionEn'],
  });
  const counter = (text: string) => ({
    text: words.about.count({ count: text.length, max: SPACE_DESCRIPTION_MAX_LENGTH }),
    over: text.length > SPACE_DESCRIPTION_MAX_LENGTH,
  });

  return {
    frame,
    fields: useProfileFields(form),
    counts: { descriptionAr: counter(descriptionAr), descriptionEn: counter(descriptionEn) },
  };
}

export type ProfileSheetView = ReturnType<typeof useProfileSheet>;
