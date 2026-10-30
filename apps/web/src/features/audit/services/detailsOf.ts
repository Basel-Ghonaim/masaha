import type { AuditEntry } from '@masaha/shared/audit';
import type { Catalogue, Language } from '@shared/copy';
import { priceText } from '@shared/lib';
import { dateText, timeText } from './atText';

/** The words an entry's details are said in. */
export type DetailsWords = {
  details: Catalogue['audit']['details'];
  /** A payment's method: «نقدًا», «تحويل». */
  methods: Readonly<Record<string, string>>;
  /** A live status set by hand: «متاح», «ممتلئ», «مغلق الآن». */
  states: Readonly<Record<string, string>>;
};

type Values = Record<string, unknown> | null;

const numberIn = (values: Values, key: string): number | null => {
  const value = values?.[key];
  return typeof value === 'number' ? value : null;
};

const textIn = (values: Values, key: string): string | null => {
  const value = values?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

const joined = (...parts: (string | null)[]) => {
  const kept = parts.filter((part) => part !== null);
  return kept.length === 0 ? null : kept.join(' · ');
};

/**
 * An entry's details (DI18, D6.1): a line only where its stored values say something a person needs
 * — an amount, a method, a reason, a change from one value to another —, else none. Each field is
 * read as its writer stores it (EC12), and a value missing or of another type is left out.
 */
export function detailsOf(
  entry: Pick<AuditEntry, 'action' | 'before' | 'after'>,
  words: DetailsWords,
  language: Language,
): string | null {
  const { before, after } = entry;
  const { details } = words;
  const money = (values: Values, key: string) => {
    const agorot = numberIn(values, key);
    return agorot === null ? null : priceText(agorot, language);
  };
  const method = () => {
    const value = textIn(after, 'method');
    return value === null ? null : (words.methods[value] ?? value);
  };
  const reason = () => {
    const value = textIn(after, 'reason');
    return value === null ? null : details.reason({ reason: value });
  };
  const fromTo = (from: string | null, to: string | null) =>
    from === null || to === null ? null : details.fromTo({ before: from, after: to });

  switch (entry.action) {
    case 'payment.recorded':
      return joined(money(after, 'amountAgorot'), method());
    case 'payment.voided':
      return joined(money(after, 'amountAgorot'), method(), reason());
    case 'visit.checkedOut':
    case 'visit.autoCheckedOut':
      return money(after, 'chargeAgorot');
    case 'visit.writtenOff':
      return joined(money(after, 'balanceAgorot'), textIn(after, 'reason'));
    case 'visit.priced':
      return joined(money(after, 'chargeAgorot'), textIn(after, 'reason'));
    case 'subscription.priceCorrected':
      return joined(
        fromTo(money(before, 'priceAgorot'), money(after, 'priceAgorot')),
        textIn(after, 'reason'),
      );
    case 'subscription.ended': {
      const endsOn = textIn(after, 'endsOn');
      return endsOn === null ? null : details.ended({ date: dateText(endsOn, language) });
    }
    case 'closure.subscriptionsExtended': {
      const ids = after?.subscriptionIds;
      const days = numberIn(after, 'days');
      return joined(
        Array.isArray(ids) ? details.subscriptions({ count: ids.length }) : null,
        days === null ? null : details.days({ count: days }),
      );
    }
    case 'user.roleChanged': {
      const roles = details.roles as Readonly<Record<string, string | undefined>>;
      const role = (values: Values) => {
        const value = textIn(values, 'role');
        return value === null ? null : (roles[value] ?? value);
      };
      return fromTo(role(before), role(after));
    }
    case 'space.statusOverridden': {
      const state = textIn(after, 'state');
      const until = textIn(after, 'until');
      if (state === null) return null;
      const word = words.states[state] ?? state;
      return until === null
        ? word
        : details.until({ state: word, time: timeText(until, language) });
    }
    case 'space.capacityEdited': {
      const capacity = (values: Values) => {
        const value = numberIn(values, 'capacity');
        return value === null ? null : String(value);
      };
      return fromTo(capacity(before), capacity(after));
    }
    case 'dataReport.dismissed':
      return textIn(after, 'note');
    default:
      return null;
  }
}
