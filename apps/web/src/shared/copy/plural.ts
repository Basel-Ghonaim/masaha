// A counted line's words, chosen by the language's own plural rules (docs/frontend/localisation.md
// › Formatting). A line passes every form it needs, and the rules pick the one its count takes.

/** An Arabic counted line: all six of the language's categories, each a whole line. */
export type ArabicPlural = Readonly<Record<Intl.LDMLPluralRule, string>>;

/** An English counted line: English uses two of the categories. */
export type EnglishPlural = { readonly one: string; readonly other: string };

// Arabic takes the locale every Intl object is given for it (localisation.md › Formatting). The
// rules only pick a category; the count's digits are the line's own.
const ARABIC_RULES = new Intl.PluralRules('ar-u-nu-latn');
const ENGLISH_RULES = new Intl.PluralRules('en');

/** The Arabic form `count` takes: «منطقة واحدة», «منطقتان», «3 مناطق», «11 منطقة»… */
export function arabicPlural(count: number, forms: ArabicPlural): string {
  return forms[ARABIC_RULES.select(count)];
}

/** The English form `count` takes: "1 area", "2 areas". */
export function englishPlural(count: number, forms: EnglishPlural): string {
  return ENGLISH_RULES.select(count) === 'one' ? forms.one : forms.other;
}
