import type { Customer } from '@masaha/shared/customers';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { toastFailed } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import { useArchive } from './useArchive';
import { useRestore } from './useRestore';

/**
 * The owner's archive of a customer and its restore (DK-014, P9), ready to render; reception is
 * offered neither (S5, the server's `customers.archive`). «أرشفة…» archives a settled customer at once,
 * its toast holding «تراجع», which restores them; one who owes is asked first, an `AlertDialog`
 * naming the debt, which stays theirs. A customer present is refused: «{name} حاضر الآن؛ سجّل خروجه
 * قبل الأرشفة.» (DI-47). «استرجاع» restores an archived one, unless another customer now holds their
 * phone. Each is sent once with no key, never again by itself (S3).
 */
export function useArchiveFlow({
  spaceId,
  customer,
  debtAgorot,
  owner,
}: {
  spaceId: number;
  customer: Customer;
  debtAgorot: number;
  owner: boolean;
}) {
  const copy = useCopy();
  const words = copy.desk.archive;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const archive = useArchive(spaceId, customer.id);
  const restore = useRestore(spaceId, customer.id);
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const name = isolate(customer.name);
  const amount = isolate(priceText(debtAgorot, language));
  const lines = { ...copy.desk.refusals, MEMBER_ALREADY_CHECKED_IN: words.present({ name }) };
  const { view } = useRefusalView(refusal, words.failed, lines);

  const runRestore = () => {
    restore.mutateAsync().then(
      (restored) => {
        toast.success(words.restored({ name: isolate(restored.name) }));
      },
      (error: unknown) => {
        toastFailed(words.restoreFailed, toAppError(error), {
          lines: { PHONE_TAKEN: words.restorePhoneTaken },
          retry: runRestore,
        });
      },
    );
  };
  const archiveSettled = () => {
    archive.mutateAsync().then(
      (archived) => {
        toast.success(words.done({ name: isolate(archived.name) }), {
          action: { label: words.undo, onClick: runRestore },
        });
      },
      (error: unknown) => {
        toastFailed(words.failed, toAppError(error), { lines, retry: archiveSettled });
      },
    );
  };
  const archiveOwing = () => {
    setRefusal(null);
    archive.mutateAsync().then(
      (archived) => {
        setOpen(false);
        toast.success(words.doneOwing({ name: isolate(archived.name), amount }));
      },
      (error: unknown) => {
        setRefusal(toAppError(error));
      },
    );
  };

  const archived = customer.archivedAt !== null;
  return {
    archive:
      owner && !archived
        ? {
            label: copy.desk.customer.menu.archive,
            busy: archive.isPending,
            run: () => {
              if (archive.isPending) return;
              if (debtAgorot > 0) {
                setRefusal(null);
                setOpen(true);
              } else {
                archiveSettled();
              }
            },
          }
        : null,
    restore:
      owner && archived
        ? {
            label: copy.desk.customer.menu.restore,
            busy: restore.isPending,
            run: () => {
              if (!restore.isPending) runRestore();
            },
          }
        : null,
    /** The question before archiving a customer who owes. */
    dialog: {
      open,
      title: words.title({ name }),
      text: words.text({ amount }),
      confirm: words.confirm,
      back: words.back,
      busy: archive.isPending,
      failure: deskFailure(refusal, view, {
        title: words.failed,
        lost: copy.desk.failure.lost,
        nothing: copy.desk.failure.nothing,
        retryLabel: copy.status.retry,
        retry: archiveOwing,
      }),
      run: archiveOwing,
      close: () => {
        if (!archive.isPending) setOpen(false);
      },
    },
  };
}

/** A customer's archive and restore, ready to render. */
export type ArchiveFlowView = ReturnType<typeof useArchiveFlow>;
