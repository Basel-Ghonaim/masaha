import type { Customer } from '@masaha/shared/customers';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { useArchiveFlow } from '../../hooks/archive/useArchiveFlow';
import { useStateActions } from '../../hooks/customer-actions/useStateActions';
import type { OpenSheet } from '../../types/SheetEntry';
import { ArchiveDialog } from '../archive/ArchiveDialog';
import { StateButtons, StateDialogs } from '../customer-actions/StateActions';
import { EditCustomerDialog } from '../edit/EditCustomerDialog';
import { CustomerMenu } from './CustomerMenu';

/**
 * A customer's actions wherever they are listed — a row of «الزبائن», a card of the desk's search,
 * the file's header: their «⋯» («ملف الزبون» where `fileLink` leads, «اشتراك جديد» opening the
 * page's subscription sheet, «تعديل البيانات», the owner's «أرشفة…»), with its dialogs; an archived customer's «استرجاع», the owner's, instead. Reception is
 * shown no archive and no restore; the server decides (S5). Either dialog, closed, gives the focus
 * back to «⋯»: the menu item that opened it has left the page.
 * `state` adds their actions by their state (D8.1): the list's, first in «⋯», read from their file
 * once it opens; the file's header's, buttons before it. A dialog they open, closed, gives the focus
 * back to the button that opened it while it stays, else to «⋯».
 */
export function CustomerActions({
  spaceId,
  customer,
  debtAgorot,
  owner,
  fileLink,
  subscribe,
  state = null,
}: {
  spaceId: number;
  customer: Customer;
  debtAgorot: number;
  owner: boolean;
  /** The customer's file, where the menu offers it; none in the file itself. */
  fileLink: string | null;
  /** Opens the page's subscription sheet, the focus coming back to «⋯». */
  subscribe: OpenSheet;
  /** Their actions by their state: in «⋯» (`menu`), as buttons before it (`buttons`), or none. */
  state?: 'menu' | 'buttons' | null;
}) {
  const copy = useCopy();
  const words = copy.desk.customer.menu;
  const flow = useArchiveFlow({ spaceId, customer, debtAgorot, owner });
  const [editing, setEditing] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const opened = useRef<HTMLElement | null>(null);
  const returnFocus = () => trigger.current;
  // Read when a dialog closes: the control that opened it while it stays, else «⋯».
  const stateFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return opened.current?.isConnected === true ? opened.current : trigger.current;
      },
    }),
    [],
  );
  const stateActions = useStateActions({
    spaceId,
    customerId: customer.id,
    read: state === 'buttons' || (state === 'menu' && menuOpened),
    subscribe,
  });
  const inMenu = state === 'menu' ? stateActions.actions : [];

  if (customer.archivedAt !== null) {
    return flow.restore === null ? null : (
      <Button variant="outline" loading={flow.restore.busy} onClick={flow.restore.run}>
        {flow.restore.label}
      </Button>
    );
  }
  return (
    <>
      {state === 'buttons' && (
        <StateButtons
          actions={stateActions.actions}
          opened={(from) => {
            opened.current = from;
          }}
        />
      )}
      <CustomerMenu
        triggerRef={trigger}
        onOpen={() => {
          setMenuOpened(true);
        }}
        menu={{
          reading: state === 'menu' && stateActions.reading,
          readingLabel: words.reading,
          state: inMenu.map((action) => ({
            key: action.key,
            label: action.label,
            run: () => {
              opened.current = null;
              action.run(trigger.current);
            },
          })),
          label: words.label({ name: isolate(customer.name) }),
          file: fileLink === null ? null : { label: words.file, to: fileLink },
          subscribe: {
            label: copy.desk.sheet.entry.subscribe,
            run: () => {
              subscribe(
                { mode: 'subscribe', customer: { ...customer, debtAgorot } },
                trigger.current,
              );
            },
          },
          edit: {
            label: words.edit,
            run: () => {
              setEditing(true);
            },
          },
          archive: flow.archive,
        }}
      />
      {editing && (
        <EditCustomerDialog
          spaceId={spaceId}
          customer={customer}
          onClose={() => {
            setEditing(false);
          }}
          returnFocus={returnFocus}
        />
      )}
      <ArchiveDialog dialog={flow.dialog} returnFocus={returnFocus} />
      {state !== null && (
        <StateDialogs spaceId={spaceId} dialogs={stateActions.dialogs} returnFocus={stateFocus} />
      )}
    </>
  );
}
