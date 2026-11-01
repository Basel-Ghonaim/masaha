import type {
  BalanceRow,
  DebtsMeta,
  DebtsQuery,
  IncomeReport,
  OccupancyReport,
  Payer,
  PayersQuery,
} from '@masaha/shared/finance';
import { api, type Page } from '@shared/api';

/**
 * The owner's finance on the server (docs/api/api-contract.md › Finance): four reads, every figure
 * the server's; `month` absent is the current Gaza month.
 */
export interface FinanceRepository {
  /** A month's income, its windows and the staff's collections. */
  income(spaceId: number, month?: string): Promise<IncomeReport>;
  /** A page of who owes, or who is in credit, with the space's totals and its reminder. */
  debts(spaceId: number, query: DebtsQuery): Promise<Page<BalanceRow[], DebtsMeta>>;
  /** A page of who paid in a month. */
  payers(spaceId: number, query: PayersQuery): Promise<Page<Payer[]>>;
  /** The occupancy statistics of a month, and the fixed windows. */
  occupancy(spaceId: number, month?: string): Promise<OccupancyReport>;
}

const base = (spaceId: number) => `/manage/spaces/${String(spaceId)}/finance`;
const monthParams = (month?: string) => (month === undefined ? {} : { params: { month } });

export function createFinanceRepository(): FinanceRepository {
  return {
    income: (spaceId, month) =>
      api.get<IncomeReport>(`${base(spaceId)}/income`, monthParams(month)),
    debts: (spaceId, query) =>
      api.getPage<BalanceRow[], DebtsMeta>(`${base(spaceId)}/debts`, { params: query }),
    payers: (spaceId, query) => api.getPage<Payer[]>(`${base(spaceId)}/payers`, { params: query }),
    occupancy: (spaceId, month) =>
      api.get<OccupancyReport>(`${base(spaceId)}/occupancy`, monthParams(month)),
  };
}
