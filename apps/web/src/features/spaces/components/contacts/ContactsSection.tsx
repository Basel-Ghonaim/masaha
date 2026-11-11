import { useContactsSection } from '../../hooks/contacts/useContactsSection';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { ContactsSheet } from './ContactsSheet';
import { ContactsView } from './ContactsView';

/** «التواصل»: the contacts as a visitor reaches them, and their Sheet. */
export function ContactsSection({ host }: { host: SectionHost }) {
  const view = useContactsSection(host);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice} empty={view.empty}>
        <ContactsView view={view} />
      </SectionCard>
      {host.editable && <ContactsSheet host={host} />}
    </>
  );
}
