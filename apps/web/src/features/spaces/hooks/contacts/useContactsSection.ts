import { useCopy } from '@shared/copy';
import { contactLinkOf } from '@shared/lib';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/**
 * «التواصل», read first (M3, C1): a tile per contact, in the order visitors see them — its icon, its
 * type's name («وسيلة أخرى»'s own name), its value small under it, left to right — each the link a
 * visitor follows (`contactLinkOf`: WhatsApp's chat, a call, an email, the page), so the owner tries
 * each as a visitor would. With none, what that costs and «أضف وسيلة تواصل».
 */
export function useContactsSection(host: SectionHost) {
  const words = useCopy().spaces.editor.contacts;
  const { space } = host;
  const empty = space.contacts.length === 0;
  const open = () => {
    host.openSheet('contacts');
  };
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'contacts',
    editable: host.editable,
    empty,
    edit: open,
  });
  return {
    frame,
    label: words.offered,
    tiles: space.contacts.map((contact) => {
      const link = contactLinkOf(contact, words);
      return {
        ...link,
        type: contact.type,
        // A link reads without its scheme, as a visitor would type it.
        shown: link.value.replace(/^https:\/\/(www\.)?/, ''),
      };
    }),
    empty: empty
      ? {
          text: words.empty.text,
          action: host.editable ? { label: words.empty.action, run: open, primary: true } : null,
        }
      : null,
  };
}

export type ContactsSectionView = ReturnType<typeof useContactsSection>;
