// A space's capacity (docs/api/api-contract.md §5, Capacity (managed)).

/** A space's capacity, private to its staff. */
export interface SpaceCapacity {
  /** The most people it seats; `null`: none set. */
  capacity: number | null;
}
