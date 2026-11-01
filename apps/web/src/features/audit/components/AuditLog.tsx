import type { AuditTarget } from '@masaha/shared/audit';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  Field,
  Input,
  ScrollTextIcon,
  SearchIcon,
  SearchXIcon,
} from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import type { SpaceNameView } from '@shared/lib';
import { ListPagination } from '@shared/lists';
import { AUDIT_SEARCH_MAX_LENGTH } from '@masaha/shared/audit';
import { useMemo } from 'react';
import { useAuditLog, type AuditLogView } from '../hooks/useAuditLog';
import type { AuditRowView } from '../types/AuditRowView';
import type { AuditScope } from '../types/AuditScope';
import { AuditCard } from './AuditCard';
import { ActionBadge, ActorText } from './AuditCells';
import { AuditFilters } from './AuditFilters';
import { AuditTargetText } from './AuditTargetText';

const column = createDataTableColumnHelper<AuditRowView>();

/** What stands in for the rows when there are none: the failure with its retry, or the empty state. */
function AuditEmpty({ log }: { log: AuditLogView }) {
  if (log.state === 'failed') {
    const { failure } = log;
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
  return (
    <EmptyState
      icon={log.state === 'noMatch' ? <SearchXIcon /> : <ScrollTextIcon />}
      title={log.empty}
    />
  );
}

/** The target, the admin's space under it, and until 1024 px the details. */
function TargetCell({ row }: { row: AuditRowView }) {
  return (
    <div className="flex flex-col gap-1">
      <AuditTargetText target={row.target} />
      {row.space !== null && (
        <span className="text-body-sm text-muted-foreground">{row.space}</span>
      )}
      {row.details !== null && (
        <span dir="auto" className="text-body-sm break-words text-muted-foreground lg:hidden">
          {row.details}
        </span>
      )}
    </div>
  );
}

/**
 * An audit log (D6.1; O13, screen 31): the intro line; the search of the target; the period, the
 * actor (when the period has more than one) and the action type, in a row from 768 px and in a
 * bottom sheet below it; the count of events; from 768 px a table — the time, the actor, the action's
 * badge, the target (with the admin's space and, until 1024 px, the details under it) and from 1024
 * px the details —, a card per entry below it; the pages. The page passes where a target leads.
 */
export function AuditLog({
  scope,
  spaceId,
  spaceName,
  linkOf,
}: {
  scope: AuditScope;
  spaceId?: number;
  spaceName?: SpaceNameView;
  linkOf: (target: AuditTarget) => string | null;
}) {
  const log = useAuditLog({ scope, spaceId, spaceName, linkOf });
  const { columns: headers } = log;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'time',
          header: headers.time,
          cell: (info) => (
            <span dir="ltr" className="whitespace-nowrap">
              {info.row.original.at}
            </span>
          ),
        }),
        column.display({
          id: 'actor',
          header: headers.actor,
          cell: (info) => <ActorText actor={info.row.original.actor} />,
        }),
        column.display({
          id: 'action',
          header: headers.action,
          cell: (info) => <ActionBadge action={info.row.original.action} />,
        }),
        column.display({
          id: 'target',
          header: headers.target,
          cell: (info) => <TargetCell row={info.row.original} />,
        }),
        column.display({
          id: 'details',
          header: headers.details,
          cell: (info) => (
            <span dir="auto" className="text-body-sm break-words">
              {info.row.original.details}
            </span>
          ),
          meta: { className: 'hidden lg:table-cell' },
        }),
      ]),
    [headers],
  );

  return (
    <div className="flex flex-col gap-4">
      {log.intro !== null && <p className="text-body-sm text-muted-foreground">{log.intro}</p>}
      <section
        aria-label={log.label}
        aria-busy={log.busy || undefined}
        className="flex flex-col gap-3"
      >
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label={log.search.label}>
            <Input
              type="search"
              placeholder={log.search.placeholder}
              startIcon={<SearchIcon />}
              maxLength={AUDIT_SEARCH_MAX_LENGTH}
              value={log.search.text}
              onChange={(event) => {
                log.search.change(event.target.value);
              }}
            />
          </Field>
        </div>
        <AuditFilters filters={log.filters} />
        <p aria-live="polite" className="text-body-sm text-muted-foreground">
          {log.count}
        </p>
        <DataTable
          label={log.label}
          cardsBelow="md"
          columns={columns}
          data={log.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => <AuditCard row={row} />}
          loading={log.state === 'loading'}
          refreshing={log.busy}
          empty={<AuditEmpty log={log} />}
          pagination={log.pagination !== null && <ListPagination pagination={log.pagination} />}
        />
      </section>
    </div>
  );
}
