import { z } from 'zod';

import { paginationQuerySchema } from '../core/index.ts';

// The owner's finance queries (docs/api/api-contract.md › Finance).

/** How many months before the current Gaza month finance reads: the current one and 23 before it. */
export const FINANCE_MONTHS_BACK = 23;

/**
 * A Gaza calendar month, `YYYY-MM`, absent for the current one (`invalid_format` otherwise). Its
 * bounds depend on the day, so the service checks them (`out_of_range` on `month`).
 */
export const financeMonthQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});
export type FinanceMonthQuery = z.infer<typeof financeMonthQuery>;

/** Who the debts list reads: the customers who owe, or those in credit. */
export const DEBT_STATES = ['OWES', 'CREDIT'] as const;

/** The debts list's query: who owes (the default) or who is in credit, paged. */
export const debtsQuerySchema = paginationQuerySchema.extend({
  state: z.enum(DEBT_STATES).default('OWES'),
});
export type DebtsQuery = z.infer<typeof debtsQuerySchema>;

/** The payers list's query: a month (the current one by default), paged. */
export const payersQuerySchema = paginationQuerySchema.extend(financeMonthQuery.shape);
export type PayersQuery = z.infer<typeof payersQuerySchema>;
