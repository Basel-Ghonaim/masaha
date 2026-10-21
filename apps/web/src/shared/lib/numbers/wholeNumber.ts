const ARABIC_INDIC_ZERO = 0x0660;

/**
 * A whole number as typed, for a form's schema to read: blank is none (`undefined`); digits, Western
 * or Arabic-Indic, the number; anything else the text itself, which the schema refuses as a wrong
 * type, so its field says so.
 */
export function wholeNumberOf(text: string): number | string | undefined {
  const typed = text
    .trim()
    .replace(/[٠-٩]/g, (digit) =>
      String((digit.codePointAt(0) ?? ARABIC_INDIC_ZERO) - ARABIC_INDIC_ZERO),
    );
  if (typed === '') return undefined;
  return /^\d+$/.test(typed) ? Number(typed) : text;
}
