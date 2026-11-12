import type { FormFailureView } from '@shared/forms';
import type { SectionId } from './SectionId';

/**
 * A section of the profile, ready to render around what it shows (G3): its title, its date line, its
 * staleness with the way to confirm it, and its «تعديل», named for the section.
 */
export type SectionFrameView = {
  id: SectionId;
  title: string;
  /** «آخر تحديث قبل 3 أيام», or none while its group was never saved. */
  date: string | null;
  /** A filled section whose group is past its threshold. */
  stale: {
    badge: string;
    line: string;
    /** «ما زالت صحيحة»: renews the group's date; none where the place may not edit. */
    confirm: { label: string; pending: boolean; blocked: boolean; run: () => void } | null;
    failure: FormFailureView | null;
  } | null;
  /** None where the place may not edit, and on an empty section, whose own action stands instead. */
  edit: { label: string; name: string; run: () => void } | null;
};
