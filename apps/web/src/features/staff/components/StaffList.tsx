import { Badge, Button, EmptyState } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { useMemo, useRef, type ReactNode } from 'react';
import { useAddStaffForm } from '../hooks/add/useAddStaffForm';
import { useStaffList } from '../hooks/list/useStaffList';
import { useShownPassword } from '../hooks/password/useShownPassword';
import type { ShownPassword } from '../types/ShownPassword';
import type { BadgeView, StaffRowView } from '../types/StaffRowView';
import { AddStaff } from './add/AddStaff';

const column = createDataTableColumnHelper<StaffRowView>();

function Badges({ badges }: { badges: BadgeView[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <Badge key={badge.label} variant={badge.variant}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

/** A person's name, then their email under it, left to right. */
function Person({ row }: { row: StaffRowView }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-label">
        <span dir="auto">{row.name}</span>
      </span>
      <span className="text-caption text-muted-foreground">
        <span dir="ltr">{row.email}</span>
      </span>
    </div>
  );
}

/**
 * The space's reception accounts: a table from 768 px, a card per person below it — the name with
 * the email under it, and the state — with their count and «إضافة موظف» above it, or an empty state
 * that offers it. Adding one opens the add sheet; the account's temporary password then shows once,
 * in the one-time dialog the page draws (`temporaryPassword`), which returns the focus to
 * «إضافة موظف» once it is done.
 */
export function StaffList({
  spaceId,
  temporaryPassword,
}: {
  spaceId: number;
  temporaryPassword: (shown: ShownPassword) => ReactNode;
}) {
  const list = useStaffList(spaceId);
  const password = useShownPassword(spaceId);
  // «إضافة موظف» above the list, where the dialog returns the focus once done.
  const addButton = useRef<HTMLButtonElement | null>(null);
  const add = useAddStaffForm({
    spaceId,
    onAdded: (added) => {
      password.show({ ...added, kind: 'created', returnFocus: addButton });
    },
  });
  const open = () => {
    add.setOpen(true);
  };

  const { columns: headers } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => <Person row={info.row.original} />,
        }),
        column.display({
          id: 'status',
          header: headers.status,
          cell: (info) => <Badges badges={info.row.original.badges} />,
        }),
      ]),
    [headers],
  );

  return (
    <>
      <DataTable
        label={list.label}
        columns={columns}
        data={list.rows}
        getRowId={(row) => String(row.key)}
        renderCard={(row) => (
          <div className="flex flex-col gap-2">
            <Person row={row} />
            <Badges badges={row.badges} />
          </div>
        )}
        loading={list.status === 'loading'}
        empty={
          list.status === 'error' ? (
            <EmptyState
              title={list.failure.title}
              description={
                <>
                  {list.failure.message}
                  {list.failure.reference !== undefined && (
                    <span className="block">{list.failure.reference}</span>
                  )}
                </>
              }
            >
              <Button
                variant="outline"
                disabled={list.failure.blocked}
                onClick={list.failure.retry}
              >
                {list.failure.retryLabel}
              </Button>
            </EmptyState>
          ) : (
            <EmptyState title={list.empty.title} description={list.empty.description}>
              <Button onClick={open}>{add.labels.open}</Button>
            </EmptyState>
          )
        }
        toolbar={
          list.status === 'ready' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-sm text-muted-foreground" aria-live="polite">
                {list.count}
              </p>
              <Button ref={addButton} onClick={open}>
                {add.labels.open}
              </Button>
            </div>
          )
        }
      />
      <AddStaff form={add} />
      {/* Outside the sheet, which closes once the account is created. */}
      {password.shown !== null && temporaryPassword(password.shown)}
    </>
  );
}
