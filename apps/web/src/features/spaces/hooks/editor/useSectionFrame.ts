import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useRefusalView, type FormFailureView } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import { updatedAgo } from '../../services/updatedAgo';
import type { EditorPlace } from '../../types/EditorPlace';
import type { SectionFrameView } from '../../types/SectionFrameView';
import { useConfirmGroup } from '../confirm/useConfirmGroup';
import { meanwhileLines } from './meanwhileLines';
import { sectionName } from './sectionName';

/** What a section's own form hands its frame. */
export type SectionForm = {
  submit: (event?: BaseSyntheticEvent) => void;
  isPending: boolean;
  blocked: boolean;
  failure: FormFailureView | null;
  /** The fields differ from the group as it was saved. */
  isDirty: boolean;
  /** Puts the fields back as the group was saved. */
  discard: () => void;
  /** The last save changed nothing, so nothing was sent. */
  unchanged: boolean;
};

/**
 * A fact group's section around its form (`SectionFrameView`): missing until it is first saved, with
 * Save only; else dated, marked stale when the server says so, and offered to confirm while it is
 * unchanged; while it has unsaved changes, it says so and can discard them. A wait the server asks
 * for, after a save or a confirmation, holds both, the limit being the admin's. A save's failure goes
 * on Discard and once the group is confirmed, but a wait's count stays. It tells the editor whether
 * it has unsaved changes (`onDirtyChange`), and no longer once it has gone.
 */
export function useSectionFrame({
  place,
  space,
  group,
  form,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  group: FactGroup;
  form: SectionForm;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}): SectionFrameView {
  const copy = useCopy();
  const words = copy.spaces.editor.section;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const title = sectionName(place, group, copy);
  const confirm = useConfirmGroup(place, space.id, group);
  const confirmFailure = useRefusalView(
    confirm.error,
    words.confirmFailureTitle({ section: title }),
    { ...meanwhileLines(place, copy), conflict: words.notSavedYet },
  );
  const { isDirty } = form;
  // A save's failure set aside by a Discard or a confirmation, until the next save.
  const [failureCleared, setFailureCleared] = useState(false);
  const blocked = form.blocked || confirmFailure.blocked;
  const saveFailure = failureCleared && form.failure?.kind !== 'rateLimit' ? null : form.failure;

  useEffect(() => {
    onDirtyChange(group, isDirty);
  }, [onDirtyChange, group, isDirty]);
  useEffect(
    () => () => {
      onDirtyChange(group, false);
    },
    [onDirtyChange, group],
  );

  const date = space.updatedAt[group];
  const missing = date === null;
  return {
    id: group,
    title,
    date: missing ? words.notAdded : words.updated({ ago: updatedAgo(date, language, new Date()) }),
    stale: !missing && space.staleGroups.includes(group) ? words.stale : null,
    unsaved: isDirty ? words.unsaved : null,
    note: form.unchanged && !isDirty && !confirm.isSuccess ? words.unchanged : null,
    save: {
      label: words.save,
      pending: form.isPending,
      blocked,
      submit: (event) => {
        confirm.reset();
        setFailureCleared(false);
        form.submit(event);
      },
    },
    discard: isDirty
      ? {
          label: words.discard,
          run: () => {
            form.discard();
            setFailureCleared(true);
          },
        }
      : null,
    confirm:
      !missing && !isDirty
        ? {
            label: words.confirm,
            pending: confirm.isPending,
            blocked,
            run: () => {
              confirm.mutate(undefined, {
                onSuccess: () => {
                  setFailureCleared(true);
                },
              });
            },
          }
        : null,
    failure: saveFailure ?? confirmFailure.view,
  };
}
