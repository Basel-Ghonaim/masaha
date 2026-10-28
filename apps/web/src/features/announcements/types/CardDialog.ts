import type { AnnouncementCardView } from './AnnouncementCardView';

/** A card's dialog, as the list holds it: an announcement's delete. */
export type CardDialog = { kind: 'delete'; card: AnnouncementCardView };

/** Opens a card's dialog, held by the list: the card's key and the control that opened it. */
export type OpenCardDialog = (dialog: CardDialog, key: string, trigger: HTMLElement) => void;
