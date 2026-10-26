import type { Customer } from '@masaha/shared/customers';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useRef, useState } from 'react';
import { useArchiveFlow } from '../../hooks/archive/useArchiveFlow';
import { ArchiveDialog } from '../archive/ArchiveDialog';
import { EditCustomerDialog } from '../edit/EditCustomerDialog';
import { CustomerMenu } from './CustomerMenu';

/**
 * A customer's actions wherever they are listed — a row of «الزبائن», a card of the desk's search,
 * the file's header: their «⋯» («ملف الزبون» where `fileLink` leads, «تعديل البيانات», the owner's
 * «أرشفة…»), with its dialogs; an archived customer's «استرجاع», the owner's, instead. Reception is
 * shown no archive and no restore; the server decides (S5). Either dialog, closed, gives the focus
 * back to «⋯»: the menu item that opened it has left the page.
 */
export function CustomerActions({
  spaceId,
  customer,
  debtAgorot,
  owner,
  fileLink,
}: {
  spaceId: number;
  customer: Customer;
  debtAgorot: number;
  owner: boolean;
  /** The customer's file, where the menu offers it; none in the file itself. */
  fileLink: string | null;
}) {
  const words = useCopy().desk.customer.menu;
  const flow = useArchiveFlow({ spaceId, customer, debtAgorot, owner });
  const [editing, setEditing] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const returnFocus = () => trigger.current;

  if (customer.archivedAt !== null) {
    return flow.restore === null ? null : (
      <Button variant="outline" loading={flow.restore.busy} onClick={flow.restore.run}>
        {flow.restore.label}
      </Button>
    );
  }
  return (
    <>
      <CustomerMenu
        triggerRef={trigger}
        menu={{
          label: words.label({ name: isolate(customer.name) }),
          file: fileLink === null ? null : { label: words.file, to: fileLink },
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
    </>
  );
}
