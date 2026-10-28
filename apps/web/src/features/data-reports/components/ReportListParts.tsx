import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  FlagIcon,
} from '@shared/design-system';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { ReportRowView } from '../types/ReportRowView';

// The parts the owner's and the admin's lists share: a report's message, what stands in for the rows,
// and «فتح».

/** A report's message, two lines at most in a row, in its own direction; none said muted. */
export function ReportMessage({ row }: { row: ReportRowView }) {
  return (
    <p
      dir="auto"
      className={
        row.message.none
          ? 'text-body-sm text-muted-foreground'
          : 'line-clamp-2 text-body-sm break-words'
      }
    >
      {row.message.text}
    </p>
  );
}

/** A list's state where its rows would be: the failure with its retry, or its empty states. */
export type ReportsEmptyView = {
  state: 'loading' | 'failed' | 'empty' | 'noMatch' | 'ready';
  failure: {
    title: string;
    message: string | undefined;
    reference: string | undefined;
    retryLabel: string;
    blocked: boolean;
    retry: () => void;
  };
  empty: { title: string; text: string | null; showAll: { label: string; run: () => void } | null };
};

/** What stands in for the rows when there are none: the failure with its retry, or the empty states. */
export function ReportsEmpty({ list }: { list: ReportsEmptyView }) {
  if (list.state === 'failed') {
    const { failure } = list;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          {failure.message}
          {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
            {failure.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  const { empty } = list;
  return (
    <EmptyState icon={<FlagIcon />} title={empty.title} description={empty.text ?? undefined}>
      {empty.showAll !== null && (
        <Button variant="outline" onClick={empty.showAll.run}>
          {empty.showAll.label}
        </Button>
      )}
    </EmptyState>
  );
}

/**
 * «فتح» (or «عرض»): opens the row's report in the sheet, keeping itself as where the focus returns;
 * when it leaves holding the focus, `onLeave` places it (a layout effect's cleanup runs before the
 * browser drops the focus).
 */
export function OpenReportButton({
  row,
  openerRef,
  onLeave,
}: {
  row: ReportRowView;
  openerRef: RefObject<HTMLElement | null>;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const button = ref.current;
    return () => {
      if (button !== null && button.ownerDocument.activeElement === button) onLeave();
    };
  }, [onLeave]);

  return (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      onClick={(event) => {
        openerRef.current = event.currentTarget;
        row.open.run();
      }}
    >
      {row.open.label}
    </Button>
  );
}
