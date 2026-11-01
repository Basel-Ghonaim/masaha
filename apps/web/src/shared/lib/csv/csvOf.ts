/** One value of a CSV row: text, a number, or none (an empty value). */
export type CsvValue = string | number | null;

const BYTE_ORDER_MARK = '﻿';

/** How a text a spreadsheet would read as a formula starts (OWASP's CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * A value as RFC 4180 writes it: quoted, its quotes doubled, when it holds `"`, `,`, CR or LF. A
 * text that starts as a formula would (`=`, `+`, `-`, `@`, a tab or a CR) is written after a `'`,
 * so Excel and LibreOffice open it as text, a phone's `+970…` kept too; a number stays a number
 * (finding 204, the owner's rule).
 */
function fieldOf(value: CsvValue): string {
  const text =
    value === null
      ? ''
      : typeof value === 'string' && FORMULA_START.test(value)
        ? `'${value}`
        : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * A CSV file's text, built in the browser (no export route): the header, then a line per row,
 * lines apart by CRLF (RFC 4180). It starts with a UTF-8 byte order mark, so Excel reads its Arabic.
 */
export function csvOf(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(fieldOf).join(','));
  return BYTE_ORDER_MARK + lines.join('\r\n');
}
