import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import type { AnnouncementCardView } from './AnnouncementCardView';

/** A card's dialog, as the list holds it: a closure's extension, or an announcement's delete. */
export type CardDialog =
  | { kind: 'extension'; closure: ManagedAnnouncement }
  | { kind: 'delete'; card: AnnouncementCardView };

/** Opens a card's dialog, held by the list: the card's key and the control that opened it. */
export type OpenCardDialog = (dialog: CardDialog, key: string, trigger: HTMLElement) => void;
