import type { SpacePackage, SUBSCRIPTION_BILLINGS } from '@masaha/shared/packages';
import type { PRICE_AUDIENCES } from '@masaha/shared/spaces';
import { agorotOf, shekelsOf } from '@shared/lib';

/** A package's optional limits, in the order the sheet offers them. */
export const LIMIT_NAMES = ['totalDays', 'daysPerWeek', 'hoursPerDay', 'totalHours'] as const;
export type LimitName = (typeof LIMIT_NAMES)[number];

/**
 * A package's terms as the sheet's fields hold them: every count and the amount as typed, the
 * limits turned on, and the shift's id as text (`''` for none). The fields carry the request's
 * names, so a refusal lands on the field it names.
 */
export type PackageValues = {
  name: string;
  validityDays: string;
  limits: LimitName[];
  totalDays: string;
  daysPerWeek: string;
  hoursPerDay: string;
  totalHours: string;
  billing: (typeof SUBSCRIPTION_BILLINGS)[number];
  /** The amount in shekels, as typed. */
  priceAgorot: string;
  audience: (typeof PRICE_AUDIENCES)[number];
  shiftId: string;
};

const ARABIC_INDIC_ZERO = 0x0660;

/** A count as typed: blank is none; digits, Western or Arabic-Indic, a number; else the text. */
function countOf(text: string): number | string | undefined {
  const typed = text
    .trim()
    .replace(/[٠-٩]/g, (digit) =>
      String((digit.codePointAt(0) ?? ARABIC_INDIC_ZERO) - ARABIC_INDIC_ZERO),
    );
  if (typed === '') return undefined;
  return /^\d+$/.test(typed) ? Number(typed) : text;
}

/** The fields of `pkg`, or of a new package: valid 30 days, a fixed price, for everyone. */
export function valuesOf(pkg: SpacePackage | null): PackageValues {
  const limit = (name: LimitName) => (pkg?.[name] == null ? '' : String(pkg[name]));
  return {
    name: pkg?.name ?? '',
    validityDays: String(pkg?.validityDays ?? 30),
    limits: LIMIT_NAMES.filter((name) => pkg?.[name] != null),
    totalDays: limit('totalDays'),
    daysPerWeek: limit('daysPerWeek'),
    hoursPerDay: limit('hoursPerDay'),
    totalHours: limit('totalHours'),
    billing: pkg?.billing ?? 'FIXED',
    priceAgorot: pkg === null ? '' : shekelsOf(pkg.priceAgorot),
    audience: pkg?.audience ?? 'GENERAL',
    shiftId: pkg?.shiftId == null ? '' : String(pkg.shiftId),
  };
}

/**
 * The request the sheet's fields name, whole, for the contract's schema to read: a limit turned off
 * is none (`null`), one turned on and left empty stays `''`, so the schema refuses it on its field;
 * the counts read Arabic-Indic digits too, the amount is whole agorot, and no shift is `null`.
 */
export function packageInput(values: PackageValues) {
  const limit = (name: LimitName) =>
    values.limits.includes(name) ? (values[name].trim() === '' ? '' : countOf(values[name])) : null;
  return {
    name: values.name,
    validityDays: countOf(values.validityDays),
    totalDays: limit('totalDays'),
    daysPerWeek: limit('daysPerWeek'),
    hoursPerDay: limit('hoursPerDay'),
    totalHours: limit('totalHours'),
    billing: values.billing,
    priceAgorot: agorotOf(values.priceAgorot),
    audience: values.audience,
    shiftId: values.shiftId === '' ? null : Number(values.shiftId),
  };
}
