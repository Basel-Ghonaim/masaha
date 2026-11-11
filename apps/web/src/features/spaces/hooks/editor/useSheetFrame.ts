import { useCopy } from '@shared/copy';
import type { FormFailureView } from '@shared/forms';
import { useEffect, useRef, useState, type BaseSyntheticEvent } from 'react';
import type { SheetFrameView } from '../../types/SheetFrameView';
import type { SheetHost } from '../../types/SheetHost';

/** What a Sheet's own form hands its frame. */
export type SheetForm = {
  submit: (event?: BaseSyntheticEvent) => void;
  isPending: boolean;
  blocked: boolean;
  failure: FormFailureView | null;
  /** The fields differ from what the Sheet opened on. */
  isDirty: boolean;
};

/**
 * A section's Sheet around its form (G1, §4.1): «حفظ» and «رجوع»; any close while it has changes —
 * «رجوع», the close button, Escape, the overlay, or a link out of it (`leave`) — asks «تجاهل
 * التغييرات؟» first, its «رجوع» going back to the Sheet and its «تجاهل التغييرات» closing it with
 * nothing sent; with none, it closes at once. A Sheet compares with what it opened on, so one opened
 * on a starting row is not changed. It tells the editor whether it has changes while open, for the
 * leave guard, and that it has none once it unmounts, as it does when its section can no longer be
 * edited.
 */
export function useSheetFrame({
  host,
  title,
  description,
  form,
}: {
  host: SheetHost;
  title: string;
  description: string | null;
  form: SheetForm;
}): SheetFrameView & { leave: (then: () => void) => void } {
  const copy = useCopy();
  const words = copy.spaces.editor;
  const [asking, setAsking] = useState(false);
  // Where a close with changes goes once it is answered «تجاهل التغييرات»: a link out of the Sheet.
  const then = useRef<(() => void) | null>(null);
  const dirty = host.open && form.isDirty;
  const { reportDirty } = host;

  useEffect(() => {
    reportDirty(dirty);
  }, [reportDirty, dirty]);
  // The last report is kept, so the unmount tells it without depending on its identity.
  const report = useRef(reportDirty);
  useEffect(() => {
    report.current = reportDirty;
  });
  useEffect(
    () => () => {
      report.current(false);
    },
    [],
  );

  // What a link out of the Sheet does runs once the Sheet has closed, so the leave guard has heard
  // it no longer has changes.
  const after = useRef<(() => void) | null>(null);
  useEffect(() => {
    const run = after.current;
    if (host.open || run === null) return;
    after.current = null;
    run();
  }, [host.open]);

  const leave = (next: (() => void) | null) => {
    if (dirty) {
      then.current = next;
      setAsking(true);
      return;
    }
    host.close();
    after.current = next;
  };

  return {
    open: host.open,
    title,
    description,
    save: {
      label: words.section.save,
      pending: form.isPending,
      blocked: form.blocked,
      submit: form.submit,
    },
    back: words.section.back,
    failure: form.failure,
    requestClose: () => {
      leave(null);
    },
    leave: (next) => {
      leave(next);
    },
    discard: {
      open: asking,
      title: words.discard.title,
      description: words.discard.description,
      back: words.discard.back,
      confirm: words.discard.discard,
      stay: () => {
        then.current = null;
        setAsking(false);
      },
      leave: () => {
        const next = then.current;
        then.current = null;
        setAsking(false);
        host.close();
        after.current = next;
      },
    },
    returnFocus: host.returnFocus,
  };
}
