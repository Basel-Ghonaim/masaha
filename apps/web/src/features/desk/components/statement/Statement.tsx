import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Skeleton,
} from '@shared/design-system';
import { useRef } from 'react';
import type { StatementView } from '../../hooks/statement/useStatement';
import { VoidPaymentAction } from '../void/VoidPaymentAction';

/**
 * A subscription's statement, inside its card (DI-43), under `id` — the toggle's `aria-controls`:
 * its check-ins, a row each that stacks below 768 px (the day, in, out, the stay, an auto check-out
 * marked); its payments, the amount with its method under it (VD-006), a voided one struck through
 * with «ملغاة» and its reason (AX-017), the owner's «⋯» at the end of one not voided (S10), the focus
 * on the payments' heading once it is voided; and the renewal's proposed start. Its own loading and
 * failure.
 */
export function Statement({
  id,
  spaceId,
  statement,
}: {
  id: string;
  spaceId: number;
  statement: StatementView;
}) {
  const payments = useRef<HTMLHeadingElement | null>(null);
  if (statement.state === 'closed') return null;

  return (
    <div id={id} className="flex flex-col gap-4 border-t border-border pt-4">
      {statement.state === 'loading' && <Skeleton className="h-24 w-full" />}
      {statement.state === 'failed' && (
        <Alert variant="destructive">
          <AlertTitle>{statement.failure.title}</AlertTitle>
          <AlertDescription>
            {statement.failure.message}
            {statement.failure.reference !== undefined && (
              <span className="block">{statement.failure.reference}</span>
            )}
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              disabled={statement.failure.blocked}
              onClick={statement.failure.retry}
            >
              {statement.failure.retryLabel}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {statement.state === 'ready' && (
        <>
          <section className="flex flex-col gap-2">
            <h4 className="text-label">{statement.checkIns.title}</h4>
            {statement.checkIns.rows.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{statement.checkIns.none}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {statement.checkIns.rows.map((row) => (
                  <li key={row.key} className="py-2">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-body-sm md:grid-cols-4">
                      <div className="flex flex-col">
                        <dt className="text-caption text-muted-foreground">
                          {statement.checkIns.columns.day}
                        </dt>
                        <dd>{row.day}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-caption text-muted-foreground">
                          {statement.checkIns.columns.in}
                        </dt>
                        <dd dir="ltr" className="self-start">
                          {row.in}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-caption text-muted-foreground">
                          {statement.checkIns.columns.out}
                        </dt>
                        <dd className="flex flex-wrap items-center gap-2">
                          <span dir="ltr">{row.out}</span>
                          {row.auto !== null && <Badge variant="neutral">{row.auto}</Badge>}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-caption text-muted-foreground">
                          {statement.checkIns.columns.duration}
                        </dt>
                        <dd dir="ltr" className="self-start">
                          {row.duration ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <h4 ref={payments} tabIndex={-1} className="text-label">
              {statement.payments.title}
            </h4>
            {statement.payments.rows.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{statement.payments.none}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {statement.payments.rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex flex-wrap items-start justify-between gap-2 py-2 text-body-sm"
                  >
                    <span className="flex flex-col">
                      <span
                        className={row.voided === null ? 'text-label' : 'text-label line-through'}
                      >
                        {row.amount}
                      </span>
                      <span className="text-caption text-muted-foreground">{row.method}</span>
                      {row.voided !== null && (
                        <span className="text-caption text-muted-foreground">
                          {row.voided.reason}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {row.voided !== null && <Badge variant="neutral">{row.voided.label}</Badge>}
                      <span className="text-muted-foreground">{row.date}</span>
                      {row.void !== null && (
                        <VoidPaymentAction
                          spaceId={spaceId}
                          payment={row.void}
                          onGone={() => payments.current?.focus()}
                        />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {statement.renewal !== null && (
            <p className="text-body-sm text-muted-foreground">{statement.renewal}</p>
          )}
        </>
      )}
    </div>
  );
}
