/** The order of every lookup list: by place, then by id, so rows that share a place keep one order. */
export const IN_ORDER = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];
