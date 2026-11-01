import type { CheckInCheckOut } from '@masaha/shared/desk';
import type { PresentPerson } from '@masaha/shared/occupancy';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toAppError } from '@shared/errors';
import { dayWord, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { toastFailed, toastSubscriberIn } from '../../components/toast/deskToasts';
import { currentOf } from '../../services/currentOf';
import { oldestOwingKey, openItems } from '../../services/openItems';
import type { OpenSheet } from '../../types/SheetEntry';
import { useCustomerFileQuery } from '../file/useCustomerFileQuery';
import type { PayTarget } from '../pay/usePayDialog';
import { useCheckInSubscriber } from '../subscriber/useCheckInSubscriber';
import { useCheckOutSubscriber } from '../subscriber/useCheckOutSubscriber';

/** One of a customer's actions by their state, ready to render as a button or a menu item. */
export type StateAction = {
  key: 'checkIn' | 'checkOut' | 'receive' | 'renew';
  label: string;
  /** The button's accessible name, naming the customer, where it differs from the label. */
  name: string | null;
  busy: boolean;
  /** `from`: the control that ran it, where the focus returns once its dialog closes. */
  run: (from: HTMLElement | null) => void;
};

/**
 * A customer's actions by their state (D8.1, DK-013), from their file — read only while `read`
 * (the list's «⋯», once opened; the file's header, whose file is read already): present, «خروج» —
 * a subscriber's one tap, a visit's check-out dialog —; else, on a current subscription that runs,
 * «حضور», one tap with its own key (S4); owing, «استلام {amount}», the **oldest owing item's**
 * balance, the payment opening on that item, named (DI32: a payment pays one item); the current
 * subscription ending soon or expired, «تجديد». An archived customer has none (their «استرجاع»
 * stands alone). The dialogs they open are the caller's to draw, from `dialogs`.
 */
export function useStateActions({
  spaceId,
  customerId,
  read,
  subscribe,
}: {
  spaceId: number;
  customerId: number;
  read: boolean;
  /** Opens the page's subscription sheet, for «تجديد». */
  subscribe: OpenSheet;
}) {
  const copy = useCopy();
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const file = useCustomerFileQuery(spaceId, read ? customerId : null).data;
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [payOpening, setPayOpening] = useState(0);
  const [visitOut, setVisitOut] = useState(false);
  const [usageDue, setUsageDue] = useState<{ name: string; checkOut: CheckInCheckOut } | null>(
    null,
  );
  const receive = (target: PayTarget) => {
    setPay(target);
    setPayOpening((count) => count + 1);
  };

  const name = file?.customer.name ?? '';
  const present = file?.present ?? null;
  // The file says who of them is here; the check-out reads the rest (a visit's rates, its quote).
  const person: PresentPerson | null =
    present === null
      ? null
      : present.kind === 'CHECK_IN'
        ? { kind: 'CHECK_IN', id: present.id, customerId, name, since: present.since }
        : {
            kind: 'VISIT',
            id: present.id,
            customerId,
            name,
            since: present.since,
            audience: 'GENERAL',
            chargeNowAgorot: null,
          };
  const subscriberOut = useCheckOutSubscriber(
    spaceId,
    person?.kind === 'CHECK_IN' ? person : null,
    {
      receive,
      usageOut: (who, checkOut) => {
        setUsageDue({ name: who, checkOut });
      },
    },
  );
  const checkIn = useCheckInSubscriber(spaceId);
  const checkInKey = useIntentKey();

  const actions: StateAction[] = [];
  if (file !== undefined && file.customer.archivedAt === null) {
    const current = currentOf(file.subscriptions);
    const heard = isolate(name);
    if (person !== null) {
      actions.push({
        key: 'checkOut',
        label: copy.desk.checkOut.open,
        name: copy.desk.checkOut.openName({ name: heard }),
        busy: subscriberOut.busy,
        run: () => {
          if (person.kind === 'VISIT') setVisitOut(true);
          else subscriberOut.run();
        },
      });
    } else if (
      current !== null &&
      (current.status === 'ACTIVE' || current.status === 'ENDING_SOON')
    ) {
      const lines = {
        ...copy.desk.refusals,
        MEMBER_ALREADY_CHECKED_IN: copy.desk.subscriber.in.alreadyHere({ name: heard }),
      };
      const run = async () => {
        if (checkIn.isPending) return;
        try {
          const answer = await checkIn.mutateAsync({
            body: { subscriptionId: current.id },
            key: checkInKey.key,
          });
          checkInKey.renew();
          toastSubscriberIn(name, answer.meta?.warnings);
        } catch (error) {
          toastFailed(copy.desk.subscriber.in.failed, toAppError(error), {
            lines,
            retry: () => void run(),
          });
        }
      };
      actions.push({
        key: 'checkIn',
        label: copy.desk.customer.checkIn,
        name: copy.desk.customer.checkInName({ name: heard }),
        busy: checkIn.isPending,
        run: () => void run(),
      });
    }
    const now = new Date();
    // The oldest owing item by the server's rule, across both kinds (DI32); the list keeps its order.
    const oldestKey = oldestOwingKey(file);
    const oldest = openItems(file, {
      visitLabel: (visit) =>
        copy.desk.pay.itemVisit({
          day: dayWord(
            visit.checkedOutAt ?? visit.checkedInAt,
            now,
            language,
            copy.desk.uncollected,
          ),
        }),
    }).find(({ key }) => key === oldestKey);
    if (oldest !== undefined) {
      actions.push({
        key: 'receive',
        label: copy.desk.customer.receive({
          amount: isolate(priceText(oldest.leftAgorot, language)),
        }),
        name: null,
        busy: false,
        run: () => {
          receive({ customerId, itemKey: oldest.key, oldest: true });
        },
      });
    }
    if (current !== null && (current.status === 'ENDING_SOON' || current.status === 'EXPIRED')) {
      actions.push({
        key: 'renew',
        label: copy.desk.sheet.entry.renew,
        name: null,
        busy: false,
        run: (from) => {
          subscribe(
            {
              mode: 'renew',
              customer: { ...file.customer, debtAgorot: file.debtAgorot },
              renews: current,
            },
            from,
          );
        },
      });
    }
  }

  return {
    actions,
    dialogs: {
      /** The payment, on the item it opened on; each opening a new intent (S4). */
      pay,
      payOpening,
      closePay: () => {
        setPay(null);
      },
      /** A present visit's check-out. */
      visitOut: visitOut && person?.kind === 'VISIT' ? person : null,
      closeVisitOut: () => {
        setVisitOut(false);
      },
      /** A usage-based subscriber's due after their check-out (D7.12). */
      usageDue,
      closeUsageDue: () => {
        setUsageDue(null);
      },
    },
  };
}

/** A customer's state actions and their dialogs, ready to render. */
export type StateActionsView = ReturnType<typeof useStateActions>;
