import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { updatedAgo } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import type { EditorPlace } from '../../types/EditorPlace';
import type { SectionFrameView } from '../../types/SectionFrameView';
import { SECTION_GROUPS, type SheetId } from '../../types/SectionId';
import { useConfirmGroup } from '../confirm/useConfirmGroup';
import { meanwhileLines } from './meanwhileLines';
import { sectionName } from './sectionName';

/**
 * A section's head, read first (G3): its title; its group's date once the group was saved, an empty
 * one's too, so a choice of "none" is seen as one (DI-8); while the section shows something and its
 * group is stale, «قد تكون قديمة» and the line that offers «ما زالت صحيحة», which renews the date
 * without editing (SD7: only a stale group is confirmed); and «تعديل», named for the section, which
 * opens its Sheet. Where the place may not edit (`editable`), it offers neither; an empty section
 * offers its own action instead of «تعديل».
 */
export function useSectionFrame({
  place,
  space,
  section,
  editable,
  empty,
  edit,
}: {
  place: EditorPlace;
  space: AdminSpace;
  section: SheetId;
  editable: boolean;
  empty: boolean;
  edit: () => void;
}): SectionFrameView {
  const copy = useCopy();
  const words = copy.spaces.editor.section;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const title = sectionName(section, copy);
  const group = SECTION_GROUPS[section];
  const confirm = useConfirmGroup(place, space.id, section);
  const confirmFailure = useRefusalView(
    confirm.error,
    words.confirmFailureTitle({ section: title }),
    { ...meanwhileLines(place, copy), conflict: words.notSavedYet },
  );
  const date = space.updatedAt[group];
  const stale = !empty && date !== null && space.staleGroups.includes(group);

  return {
    id: section,
    title,
    date: date === null ? null : words.updated({ ago: updatedAgo(date, language, new Date()) }),
    stale: stale
      ? {
          badge: words.stale,
          line: words.staleLine,
          confirm: editable
            ? {
                label: words.confirm,
                pending: confirm.isPending,
                blocked: confirmFailure.blocked,
                run: () => {
                  confirm.mutate();
                },
              }
            : null,
          failure: confirmFailure.view,
        }
      : null,
    edit:
      editable && !empty
        ? { label: words.edit, name: words.editNamed({ section: title }), run: edit }
        : null,
  };
}
