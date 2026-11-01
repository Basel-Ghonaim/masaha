import type { AuditEntityType, AuditTarget } from '@masaha/shared/audit';
import type { Catalogue } from '@shared/copy';

// The types whose name the API answers in both languages: a space's and a lookup's.
const BILINGUAL: readonly AuditEntityType[] = ['space', 'governorate', 'area', 'amenity'];

/** An entry's target as the log shows it: its name, marked when not the interface's language. */
export type TargetView = {
  text: string;
  /** A name in the other language than the interface's, marked as such. */
  lang?: 'en' | 'ar';
  dir?: 'ltr' | 'rtl';
  /** A person's or a record's own words, isolated from the line around them. */
  isolated: boolean;
  /** Where the target has a page; never for a deleted one. */
  link: string | null;
};

/** The target's current name in the interface's language, or none when it has none. */
function nameOf(
  target: AuditTarget,
  english: boolean,
): Omit<TargetView, 'link' | 'isolated'> | null {
  if (!BILINGUAL.includes(target.type)) return target.name === null ? null : { text: target.name };
  const first = english ? target.name : target.nameAr;
  if (first !== null) return { text: first };
  const other = english ? target.nameAr : target.name;
  if (other === null) return null;
  return english
    ? { text: other, lang: 'ar', dir: 'rtl' }
    : { text: other, lang: 'en', dir: 'ltr' };
}

/**
 * An entry's target (D6.1): its current name in the interface's language (a space's or a lookup's
 * Arabic name, else its English one, marked); with none, its type's word («دفعة», «إعلان»…); a
 * deleted one «{name} (محذوفة)», never a link; else a link where the page's `linkOf` gives one.
 */
export function targetOf(
  target: AuditTarget,
  words: Catalogue['audit'],
  english: boolean,
  linkOf: (target: AuditTarget) => string | null,
): TargetView {
  const name = nameOf(target, english);
  const types = words.targets as Readonly<Record<string, string | undefined>>;
  const shown = name ?? { text: types[target.type] ?? target.type };
  if (target.deleted) {
    return {
      ...shown,
      text: words.deleted({ name: shown.text }),
      isolated: name !== null,
      link: null,
    };
  }
  return { ...shown, isolated: name !== null, link: linkOf(target) };
}
