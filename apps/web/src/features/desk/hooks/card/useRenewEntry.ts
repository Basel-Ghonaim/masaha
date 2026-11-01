import type { CustomerRow } from '@masaha/shared/desk';
import { currentCopy } from '@shared/copy';
import { toAppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toastFailed } from '../../components/toast/deskToasts';
import { createDeskRepository } from '../../repository/deskRepository';
import type { OpenSheet } from '../../types/SheetEntry';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * «تجديد» from where only a customer's row is known (a search card, the pre-check-in choice): their
 * current subscription's state is read first, by its statement, then the page's sheet opens to renew
 * it (G13.8); `from` is where the focus returns once it closes. A failed read says so, with a retry.
 */
export function useRenewEntry(spaceId: number, subscribe: OpenSheet) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const renew = async (row: CustomerRow, from: HTMLElement | null) => {
    const { current } = row;
    if (current === null || busy) return;
    setBusy(true);
    try {
      const renews = await client.query({
        queryKey: deskKeys.statement(spaceId, current.id),
        queryFn: () => repository.statement(spaceId, current.id),
      });
      subscribe({ mode: 'renew', customer: row, renews }, from);
    } catch (error) {
      toastFailed(currentCopy().desk.customer.renewFailed, toAppError(error), {
        retry: () => void renew(row, from),
      });
    } finally {
      setBusy(false);
    }
  };
  return { busy, renew };
}
