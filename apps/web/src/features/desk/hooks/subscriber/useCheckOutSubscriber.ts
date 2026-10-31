import type { CheckInCheckOut } from '@masaha/shared/desk';
import type { PresentPerson } from '@masaha/shared/occupancy';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { useMutation } from '@tanstack/react-query';
import type { PayTarget } from '../pay/usePayDialog';
import { toastFailed, toastSubscriberOut } from '../../components/toast/deskToasts';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Opens the page's due dialog for a usage-based subscriber's check-out, from its answer. */
export type UsageOut = (name: string, answer: CheckInCheckOut) => void;

/**
 * A subscriber's «خروج», one tap: no dialog and no key — closing is idempotent by design, so it is
 * sent once and a lost answer is the user's to retry (S3). Done, the space is read again, the toast
 * says how long they stayed — for a usage-based subscription, `usageOut` opens the page's dialog
 * of what is due instead (D7.12) — and and what their subscription still owes, from the answer (S8), with
 * «استلام» opening the payment on it (`receive`), and `done` runs (the search's: cleared and focused, S10). Pressed again while it is sent, nothing happens.
 */
export function useCheckOutSubscriber(
  spaceId: number,
  person: Extract<PresentPerson, { kind: 'CHECK_IN' }>,
  {
    done,
    receive,
    usageOut,
  }: { done?: () => void; receive?: (target: PayTarget) => void; usageOut?: UsageOut } = {},
) {
  const copy = useCopy();
  const { settle, linkEnded } = useDeskWrite();
  const mutation = useMutation<CheckInCheckOut, AppError>({
    mutationFn: () => repository.checkOutSubscriber(spaceId, person.id),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });

  const run = () => {
    if (mutation.isPending) return;
    mutation.mutate(undefined, {
      onSuccess: (answer) => {
        // A usage-based subscription's due is said in a dialog, from the answer (D7.12, DI10);
        // a fixed one stays one tap with its toast.
        if (answer.subscription.billing !== 'FIXED' && usageOut !== undefined) {
          usageOut(person.name, answer);
          done?.();
          return;
        }
        toastSubscriberOut(
          person.name,
          answer,
          receive &&
            (() => {
              receive({
                customerId: answer.customer.id,
                itemKey: `subscription-${String(answer.subscription.id)}`,
              });
            }),
        );
        done?.();
      },
      onError: (error) => {
        toastFailed(copy.desk.subscriber.out.failed, error, {
          lines: copy.desk.refusals,
          retry: run,
        });
      },
    });
  };

  return {
    label: copy.desk.checkOut.open,
    name: copy.desk.checkOut.openName({ name: isolate(person.name) }),
    busy: mutation.isPending,
    run,
  };
}
