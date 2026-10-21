// The answers of the managed customers endpoints (docs/api/api-contract.md §5, Customers (managed)).

/** A customer of a space, as its staff see them; `archivedAt` set while archived. */
export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  archivedAt: string | null;
}
