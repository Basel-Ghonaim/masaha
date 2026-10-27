import type {
  CheckInCheckOut,
  DeskWarning,
  NewSubscription,
  ReceivedPayment,
  VisitCheckOut,
} from '@masaha/shared/desk';
import type { DeskVisit } from '@masaha/shared/visits';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { RefusalText, type FailureLines } from '@shared/forms';
import { priceText } from '@shared/lib';
import { currentLanguage, isolate } from '@shared/localisation';
import { warningLines } from '../../services/warningLines';
import type { UncollectedItem } from '../../types/UncollectedItem';
import type { VoidTarget } from '../../types/VoidTarget';

// Worded when they land, in the language the interface speaks then (S8: from the server's answer).
const priceNow = (agorot: number) =>
  isolate(priceText(agorot, currentLanguage() === 'en' ? 'en' : 'ar'));

/**
 * Says a visitor was checked in, naming them; the server's warnings, each its line, make it a warning
 * that stays until it is closed (S6).
 */
export function toastCheckedIn(name: string, warnings: readonly DeskWarning[] | undefined) {
  toastWarned(currentCopy().desk.visit.done({ name: isolate(name) }), warnings);
}

/** Says a subscriber was checked in, naming them, with the server's warnings (S6). */
export function toastSubscriberIn(name: string, warnings: readonly DeskWarning[] | undefined) {
  toastWarned(currentCopy().desk.subscriber.in.done({ name: isolate(name) }), warnings);
}

/**
 * A check-in's toast: a success, or — with the server's warnings, each its line — a warning that stays
 * until it is closed (S6).
 */
function toastWarned(title: string, warnings: readonly DeskWarning[] | undefined) {
  const copy = currentCopy();
  const lines = warningLines(warnings, copy.errors);
  if (lines.length === 0) {
    toast.success(title);
    return;
  }
  toast.warning(title, {
    description: lines.map((line) => (
      <span key={line} className="block">
        {line}
      </span>
    )),
    duration: Infinity,
  });
}

/**
 * Says a visit was checked out, naming its visitor, then what the answer recorded: the amount and its
 * method, or that nothing was paid, or that it closed unpriced; and what stays owed, by whom.
 */
export function toastCheckedOut(name: string, { visit, payment }: VisitCheckOut) {
  const words = currentCopy().desk;
  const paid = payment?.amountAgorot ?? 0;
  const parts = [
    payment !== null
      ? words.toast.paid({
          amount: priceNow(payment.amountAgorot),
          method: words.money.methodIn[payment.method],
        })
      : visit.charge === null
        ? words.toast.unpriced
        : words.toast.notPaid,
  ];
  const left = visit.charge === null ? 0 : visit.charge.amountAgorot - paid;
  if (left > 0) {
    parts.push(
      words.money.owes({
        amount: priceNow(left),
        name: isolate(visit.customer?.name ?? visit.visitorName ?? name),
      }),
    );
  }
  toast.success(words.checkOut.done({ name: isolate(name) }), { description: parts.join(' · ') });
}

/**
 * Says an uncollected visit was paid, naming its visitor and its day, then what the answer recorded:
 * the amount and its method, and what the visit still owes, by whom (S8).
 */
export function toastCollected(
  item: UncollectedItem,
  { visit, payment, balanceAgorot }: ReceivedPayment,
) {
  const words = currentCopy().desk;
  const parts = [
    words.toast.paid({
      amount: priceNow(payment.amountAgorot),
      method: words.money.methodIn[payment.method],
    }),
  ];
  if (balanceAgorot > 0) {
    parts.push(
      words.money.owes({
        amount: priceNow(balanceAgorot),
        name: isolate(visit?.customer?.name ?? item.name),
      }),
    );
  }
  toast.success(words.collect.done({ name: isolate(item.name), day: item.day }), {
    description: parts.join(' · '),
  });
}

/** Says a visit's unpaid rest is now a customer's debt, naming the customer the answer gave it. */
export function toastDebtRecorded(item: UncollectedItem, visit: DeskVisit) {
  const words = currentCopy().desk;
  const { balanceAgorot } = item.uncollected;
  toast.success(
    words.debt.done({
      amount: balanceAgorot === null ? words.uncollected.unpriced : priceNow(balanceAgorot),
      name: isolate(visit.customer?.name ?? item.name),
    }),
  );
}

/**
 * Says a visit was written off, and stays until it is closed (DI-29): its «تراجع» is the only way back,
 * since no screen lists a written-off visit (finding 164). The undo is sent once, never again by
 * itself (S3), and says whether it was undone.
 */
export function toastWrittenOff(
  item: UncollectedItem,
  amount: number,
  undo: () => Promise<unknown>,
) {
  const words = currentCopy().desk.writeOff;
  toast.success(words.done({ amount: priceNow(amount), who: isolate(item.name) }), {
    duration: Infinity,
    action: {
      label: words.undo,
      onClick: () => {
        undo().then(
          () => {
            toast.success(currentCopy().desk.writeOff.undone);
          },
          (error: unknown) => {
            const failure = currentCopy().desk.writeOff.undoFailed;
            toast.error(failure, {
              description: <RefusalText refusal={toAppError(error)} title={failure} />,
              duration: Infinity,
            });
          },
        );
      },
    },
  });
}

/** Says a payment was voided, naming its amount and who, and that it counts in nothing now (DI-7). */
export function toastVoided(payment: VoidTarget) {
  const words = currentCopy().desk.void;
  toast.success(words.done({ amount: priceNow(payment.amountAgorot), who: isolate(payment.who) }), {
    description: words.doneText,
  });
}

/** Says an unpriced visit was priced, naming its visitor, at the charge the answer holds (S8). */
export function toastPriced(name: string, visit: DeskVisit) {
  const words = currentCopy().desk.unpriced;
  toast.success(
    words.done({ name: isolate(name), amount: priceNow(visit.charge?.amountAgorot ?? 0) }),
  );
}

/**
 * Says a subscriber was checked out, naming them, then how long they stayed and, while their
 * subscription still owes, what stays on it, from the answer (S8), with «استلام» (`receive`).
 */
export function toastSubscriberOut(name: string, checkOut: CheckInCheckOut, receive?: () => void) {
  const copy = currentCopy();
  const words = copy.desk.subscriber.out;
  const out = checkOut.checkedOutAt ?? checkOut.checkedInAt;
  const stayed = Math.max(0, Date.parse(out) - Date.parse(checkOut.checkedInAt));
  const total = Math.floor(stayed / 60_000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const time =
    hours === 0
      ? copy.occupancy.present.minutes({ minutes })
      : copy.occupancy.present.duration({ hours, minutes });
  const parts = [words.stay({ time: isolate(time) })];
  if (checkOut.balanceAgorot > 0)
    parts.push(words.owes({ amount: priceNow(checkOut.balanceAgorot) }));
  const owes = checkOut.balanceAgorot > 0;
  toast.success(words.done({ name: isolate(name) }), {
    description: parts.join(' · '),
    // What stays owed is paid from the toast: «استلام» opens the payment on that subscription.
    ...(owes && receive !== undefined && { action: { label: words.receive, onClick: receive } }),
  });
}

/**
 * Says a write with no dialog failed (DI-8): no answer says a retry is safe and offers it, with the
 * same key; a refusal says why, the screen's own line first (`lines`).
 */
export function toastFailed(
  title: string,
  failure: AppError,
  { lines, retry }: { lines?: FailureLines; retry?: () => void },
) {
  const copy = currentCopy();
  if (failure.type === 'network' || failure.type === 'timeout') {
    toast.error(title, {
      description: copy.desk.failure.lost,
      duration: Infinity,
      ...(retry !== undefined && { action: { label: copy.status.retry, onClick: retry } }),
    });
    return;
  }
  toast.error(title, {
    description: <RefusalText refusal={failure} title={title} lines={lines} />,
  });
}

/**
 * Says a payment was recorded on one item: who, the item and what it still owes, then the amount and
 * its method, all from the answer (S8). A usage-based subscription in credit owes nothing.
 */
export function toastPaid(name: string, item: string, { payment, balanceAgorot }: ReceivedPayment) {
  const words = currentCopy().desk;
  toast.success(
    words.pay.done({
      name: isolate(name),
      item: isolate(item),
      left: priceNow(Math.max(0, balanceAgorot)),
    }),
    {
      description: words.toast.paid({
        amount: priceNow(payment.amountAgorot),
        method: words.money.methodIn[payment.method],
      }),
    },
  );
}

/**
 * Says a subscription was saved, or renewed, naming the customer, then all from the answer (S8,
 * finding 171): the subscription's name and the price the server charged (a rate, with its unit, when
 * it is billed from attendance); each part the amount received paid, in the order the server
 * allocated it (decision 3, K4), each item named by `itemLabel` (the earlier debts the sheet listed),
 * the new subscription by its name, else «دين سابق»; or that nothing was paid; and what the customer
 * still owes. The server's `CUSTOMER_HAS_DEBT` makes it a warning that stays until it is closed.
 */
export function toastSubscribed(
  name: string,
  { subscription, payments, debtAgorot }: NewSubscription,
  {
    renewed,
    itemLabel,
    warnings,
  }: {
    renewed: boolean;
    itemLabel: (item: NewSubscription['payments'][number]['item']) => string | undefined;
    warnings: readonly 'CUSTOMER_HAS_DEBT'[] | undefined;
  },
) {
  const copy = currentCopy();
  const words = copy.desk.sheet;
  const charged =
    subscription.billing === 'FIXED'
      ? priceNow(subscription.priceAgorot)
      : words.rate({
          rate: priceNow(subscription.priceAgorot),
          unit: copy.desk.subscriber.progress.units[subscription.billing],
        });
  const lines = [words.done.charged({ name: isolate(subscription.name), amount: charged })];
  if (payments.length === 0) lines.push(words.done.noPayment);
  for (const { item, payment } of payments) {
    const label =
      'subscriptionId' in item && item.subscriptionId === subscription.id
        ? subscription.name
        : (itemLabel(item) ?? words.done.earlier);
    lines.push(words.done.part({ item: isolate(label), amount: priceNow(payment.amountAgorot) }));
  }
  if (debtAgorot > 0) lines.push(words.done.owes({ amount: priceNow(debtAgorot) }));
  const warned = (warnings ?? []).map((code) => copy.errors[code]);
  const title = renewed
    ? words.done.renewed({ name: isolate(name) })
    : words.done.new({ name: isolate(name) });
  const description = [...lines, ...warned].map((line) => (
    <span key={line} className="block">
      {line}
    </span>
  ));
  if (warned.length === 0) {
    toast.success(title, { description });
    return;
  }
  toast.warning(title, { description, duration: Infinity });
}
