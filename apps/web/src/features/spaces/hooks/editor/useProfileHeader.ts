import type { AdminSpace, SpacePhoto } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { isolated } from '@shared/forms';
import { spaceNameOf } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import type { Completeness } from '../../services/completeness';
import type { EditorPlace } from '../../types/EditorPlace';
import { sectionName } from './sectionName';

/** A badge of the header, by its variant. */
type HeaderBadge = { label: string; variant: 'success' | 'warning' | 'neutral' };

/**
 * The profile's header, ready to render (H1–H4, M2): a summary, never a section. The cover, or with
 * no photo the space's letter tile and «أضف صورة غلاف», which opens the photos' edit state; the
 * name; its state — «موثّقة» always for an owner, «موثّقة» or «غير موثّقة» for the admin, and
 * «مخفية عن الزوار» while hidden; «عرض الصفحة العامة» and «نسخ الرابط», which puts the page's
 * absolute address on the clipboard, or, refused, says the link to copy by hand; and «اكتمال الملف»,
 * the share of the seven sections filled and a line of links to those missing or stale, or «الملف
 * مكتمل ومحدّث» — waiting while the gallery is read, and once its read has failed saying it cannot
 * count, with «إعادة المحاولة», which reads it again (`galleryRetry`).
 */
export function useProfileHeader({
  place,
  space,
  photos,
  completeness,
  galleryRetry,
  publicHref,
  editable,
  addCover,
}: {
  place: EditorPlace;
  space: AdminSpace;
  photos: SpacePhoto[] | undefined;
  completeness: Completeness | null;
  galleryRetry: (() => void) | null;
  publicHref: string;
  editable: boolean;
  addCover: () => void;
}) {
  const copy = useCopy();
  const words = copy.spaces.editor.header;
  const english = useLanguage() === 'en';
  const cover = photos?.[0];
  const badges: HeaderBadge[] = [
    place === 'owner' || space.isVerified
      ? { label: words.verified, variant: 'success' }
      : { label: words.unverified, variant: 'warning' },
    ...(space.isHidden ? [{ label: words.hidden, variant: 'neutral' as const }] : []),
  ];
  const absolute = `${window.location.origin}${publicHref}`;

  return {
    name: spaceNameOf(space, english),
    /** The English name's first letter, while the space has no photo. */
    letter: space.nameEn.trim().charAt(0).toLocaleUpperCase('en'),
    cover: cover === undefined ? null : { src: cover.urls.card },
    addCover:
      photos !== undefined && cover === undefined && editable
        ? { label: words.addCover, run: addCover }
        : null,
    badges,
    publicLink: { label: words.viewPublic, href: publicHref },
    copyLink: {
      label: words.copyLink,
      run: () => {
        const refused = () => {
          // The link is shown whole, left to right, to copy by hand; it stays until closed.
          toast.error(words.copyFailed, { description: isolated(absolute), duration: Infinity });
        };
        // An unsecured page or an old browser has no clipboard to write to: it throws at once.
        try {
          navigator.clipboard.writeText(absolute).then(() => {
            toast(words.copied);
          }, refused);
        } catch {
          refused();
        }
      },
    },
    uncounted:
      completeness === null && galleryRetry !== null
        ? { message: words.uncounted, retry: { label: copy.status.retry, run: galleryRetry } }
        : null,
    completeness:
      completeness === null
        ? null
        : {
            label: words.completeness,
            done: completeness.done,
            total: completeness.total,
            valueText: words.count({ done: completeness.done, total: completeness.total }),
            issuesLabel: words.issues,
            issues: completeness.issues.map((section) => ({
              id: section,
              label:
                completeness.states[section] === 'stale'
                  ? words.stalePart({ section: sectionName(section, copy) })
                  : words.missingPart({ section: sectionName(section, copy) }),
            })),
            complete: completeness.issues.length === 0 ? words.complete : null,
          },
  };
}

export type ProfileHeaderView = ReturnType<typeof useProfileHeader>;
