const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/**
 * A text with its Arabic-Indic digits (٠–٩, U+0660–U+0669) and the extended ones a Persian or Urdu
 * keyboard types (۰–۹, U+06F0–U+06F9) as Western digits; everything else as it is. The one reader
 * of typed digits: each field's own rule (a whole number, an amount, a time, a point) reads its
 * result.
 */
export function toWesternDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.codePointAt(0) ?? ARABIC_INDIC_ZERO;
    return String(
      code - (code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO),
    );
  });
}
