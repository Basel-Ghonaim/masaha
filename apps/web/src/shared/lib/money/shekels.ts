const ARABIC_INDIC_ZERO = 0x0660;

/** An amount in agorot as shekels: `1500` → `15`, `1250` → `12.50`. */
export function shekelsOf(agorot: number): string {
  return agorot % 100 === 0 ? String(agorot / 100) : (agorot / 100).toFixed(2);
}

/**
 * The agorot an amount typed in shekels names: Western or Arabic-Indic digits, `.`, `,` or `٫` as
 * the separator, up to two decimals, as whole agorot. A blank is no value (`undefined`). A text it
 * cannot read, or one past two decimals, such as `12.500` or a thousands separator in `1,000`, is
 * handed back as typed, so the contract's schema refuses it as `invalid_format`.
 */
export function agorotOf(text: string): number | string | undefined {
  const typed = text
    .trim()
    .replace(/[٠-٩]/g, (digit) =>
      String((digit.codePointAt(0) ?? ARABIC_INDIC_ZERO) - ARABIC_INDIC_ZERO),
    )
    .replace(/[,٫]/, '.');
  if (typed === '') return undefined;
  const parts = /^(\d*)(?:\.(\d*))?$/.exec(typed);
  if (parts === null || !/\d/.test(typed)) return text;
  const shekels = Number(typed);
  const decimals = parts[2]?.length ?? 0;
  return decimals <= 2 ? Math.round(shekels * 100) : text;
}
