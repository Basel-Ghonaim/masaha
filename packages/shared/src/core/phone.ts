import { z } from 'zod';

// One phone number has one form (docs/architecture/data-model.md › Conventions, Contacts): E.164,
// for a Palestinian (+970) or an Israeli (+972) number. It may arrive international (+970…,
// 00970…) or local (0…), with the separators people type between its digits.

/** What people type between digits: spaces, dashes, dots and parentheses. Nothing else. */
const SEPARATORS = /[\s\-.()]/g;

/** A mobile's national number: 5 and eight digits. */
const MOBILE = /^5\d{8}$/;
/** A landline's national number: an area digit (not 5, a mobile's) and seven digits. */
const LANDLINE = /^[2-46-9]\d{7}$/;
/** Palestinian mobiles (Jawwal 059, Ooredoo 056) are always +970. */
const PALESTINIAN_MOBILE = /^5[69]/;

/** A trunk `(0)` written after the country code: `+970 (0)59 …`. */
const TRUNK_AFTER_COUNTRY = /^((?:\+|00)97[02])\s*\(0\)/;

/** The number in its E.164 form, or null when it is not a Palestinian or Israeli number. */
export function normalisePhone(input: string): string | null {
  const digits = input.trim().replace(TRUNK_AFTER_COUNTRY, '$1').replace(SEPARATORS, '');
  const match = /^(?:(?:\+|00)(970|972)|0)(\d+)$/.exec(digits);
  if (!match) return null;
  const [, given, national = ''] = match;
  const mobile = MOBILE.test(national);
  if (!mobile && !LANDLINE.test(national)) return null;

  const country = PALESTINIAN_MOBILE.test(national) ? '970' : (given ?? (mobile ? '972' : '970'));
  return `+${country}${national}`;
}

/** A phone number, stored in its E.164 form; anything else is `invalid_format`. */
export const phoneSchema = z
  .string()
  .max(30)
  .transform((input, ctx) => {
    const phone = normalisePhone(input);
    if (phone) return phone;
    ctx.addIssue({
      code: 'custom',
      params: { code: 'invalid_format' },
      message: 'Not a Palestinian or Israeli phone number',
    });
    return z.NEVER;
  });
