import { useSearchParams } from 'react-router';
import { currentMonth, financeMonths } from '../services/months';

/** Finance's tabs, by their address. */
export const FINANCE_TABS = ['income', 'debts', 'occupancy'] as const;
export type FinanceTab = (typeof FINANCE_TABS)[number];

/** A positive whole number from the address, else none. */
function positive(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 && number <= 2_147_483_647 ? number : undefined;
}

/**
 * Finance's place, as the address holds it (DI29): `?tab=income|debts|occupancy&month=YYYY-MM`, the
 * defaults — income, the current Gaza month — never written, a month outside the 24 read as the
 * current one; and the debts' two lists' pages, `?page=` (who owes) and `?credit=` (who is in
 * credit), the first never written. A new tab or month starts each list on its first page.
 */
export function useFinanceTabs() {
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const months = financeMonths(now);
  const current = currentMonth(now);
  const tabParam = params.get('tab');
  const tab: FinanceTab = FINANCE_TABS.find((choice) => choice === tabParam) ?? 'income';
  const monthParam = params.get('month');
  const month = monthParam !== null && months.includes(monthParam) ? monthParam : current;

  const searchOf = (next: {
    tab?: FinanceTab;
    month?: string;
    page?: number;
    credit?: number;
  }): string => {
    const search = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextMonth = next.month ?? month;
    if (nextTab !== 'income') search.set('tab', nextTab);
    if (nextMonth !== current) search.set('month', nextMonth);
    if (next.page !== undefined && next.page > 1) search.set('page', String(next.page));
    if (next.credit !== undefined && next.credit > 1) search.set('credit', String(next.credit));
    const text = search.toString();
    return text === '' ? '' : `?${text}`;
  };

  return {
    tab,
    month,
    /** The month to ask the server for: none for the current one, as the address. */
    asked: month === current ? undefined : month,
    months,
    current,
    owesPage: positive(params.get('page')) ?? 1,
    creditPage: positive(params.get('credit')) ?? 1,
    searchOf,
    setTab: (next: FinanceTab) => {
      setParams(searchOf({ tab: next }));
    },
    setMonth: (next: string) => {
      setParams(searchOf({ month: next }));
    },
  };
}

/** Finance's place in the address. */
export type FinanceTabsView = ReturnType<typeof useFinanceTabs>;
