import type { DeskWarning, VisitCheckOut } from '@masaha/shared/desk';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { priceText } from '@shared/lib';
import { currentLanguage, isolate } from '@shared/localisation';
import { warningLines } from '../../services/warningLines';

// Worded when they land, in the language the interface speaks then (S8: from the server's answer).
const priceNow = (agorot: number) =>
  isolate(priceText(agorot, currentLanguage() === 'en' ? 'en' : 'ar'));

/**
 * Says a visitor was checked in, naming them; the server's warnings, each its line, make it a warning
 * that stays until it is closed (S6).
 */
export function toastCheckedIn(name: string, warnings: readonly DeskWarning[] | undefined) {
  const copy = currentCopy();
  const title = copy.desk.visit.done({ name: isolate(name) });
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
