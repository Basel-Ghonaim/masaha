import type { DirectoryRequest } from './DirectoryRequest';

/**
 * The map's query, named as the contract names it: the list's filters, with no order, page,
 * language or limit, and the box in view when the map asks within it (`south,west,north,east`).
 */
export type PinsRequest = Omit<DirectoryRequest, 'limit' | 'sort' | 'lang' | 'page'> & {
  bounds?: string;
};
