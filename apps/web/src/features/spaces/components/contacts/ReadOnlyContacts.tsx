import type { AdminSpace } from '@masaha/shared/spaces';
import { Badge } from '@shared/design-system';
import { useReadOnlyContacts } from '../../hooks/contacts/useReadOnlyContacts';
import { ReadOnlyCard } from '../editor/ReadOnlyCard';
import { ReadOnlyItem } from '../editor/ReadOnlyRows';

/** «التواصل» of a verified space, to read: each contact by its type, as stored, a phone's carrier. */
export function ReadOnlyContacts({ space }: { space: AdminSpace }) {
  const view = useReadOnlyContacts(space);

  return (
    <ReadOnlyCard id="contacts" title={view.title}>
      {view.contacts.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{view.none}</p>
      ) : (
        <dl className="flex flex-col divide-y divide-border">
          {view.contacts.map((contact) => (
            <ReadOnlyItem key={contact.key} label={contact.label}>
              <span className="flex flex-wrap items-center gap-2">
                <span dir="ltr">{contact.value}</span>
                {contact.carrier && <Badge variant="neutral">{contact.carrier}</Badge>}
              </span>
            </ReadOnlyItem>
          ))}
        </dl>
      )}
    </ReadOnlyCard>
  );
}
