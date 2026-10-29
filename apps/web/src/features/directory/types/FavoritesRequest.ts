import type { NearPoint } from './NearState';

/** How the user's favourites are asked for: newest saved first, or nearest first from a point. */
export type FavoritesRequest = { near?: NearPoint };
