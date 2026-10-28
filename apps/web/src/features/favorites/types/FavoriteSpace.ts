import type { SpaceNameView } from '@shared/lib';

/** The space a heart saves: its id, and its name as the card or the page shows it. */
export type HeartSpace = { id: number; name: SpaceNameView };

/** What the page does for a guest's press (shows its sign-in), and what lets the held press go. */
export type FavoriteSignIn = (reason: 'favorite', cancel: () => void) => void;
