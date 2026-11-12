import { useCopy } from '@shared/copy';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/** A description long enough to fold: past four lines, or about as many characters. */
const isLong = (text: string) => text.length > 240 || text.split('\n').length > 4;

/**
 * «عن المساحة», read first (B1): the Arabic and the English side by side, each its name, then its
 * description, in its own language and direction; a long description folds to four lines with «عرض
 * المزيد»; a missing one says what it costs the visitors of that language, and a missing Arabic name
 * says so. Its head is the profile group's.
 */
export function useAboutSection(host: SectionHost) {
  const words = useCopy().spaces.editor.about;
  const { space } = host;
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'about',
    editable: host.editable,
    empty: false,
    edit: () => {
      host.openSheet('about');
    },
  });
  const column = (lang: 'ar' | 'en') => {
    const name = lang === 'ar' ? space.nameAr : space.nameEn;
    const description = (lang === 'ar' ? space.descriptionAr : space.descriptionEn) ?? '';
    return {
      lang,
      heading: lang === 'ar' ? words.inArabic : words.inEnglish,
      name,
      noName: name === null ? words.noArabicName : null,
      description: description === '' ? null : description,
      fold: isLong(description) ? { more: words.more, less: words.less } : null,
      missing:
        description === ''
          ? lang === 'ar'
            ? words.noArabicDescription
            : words.noEnglishDescription
          : null,
    };
  };
  return { frame, columns: [column('ar'), column('en')] };
}

export type AboutColumnView = ReturnType<typeof useAboutSection>['columns'][number];
