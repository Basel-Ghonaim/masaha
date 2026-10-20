/**
 * Which lists a space's area and amenity fields read: the admin's, retired and hidden rows
 * included, or the public catalogue's, the only one an owner may read.
 */
export type LookupsSource = 'admin' | 'public';
