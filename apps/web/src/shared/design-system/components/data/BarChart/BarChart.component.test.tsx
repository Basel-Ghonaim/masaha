import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { BarChart, type BarChartProps } from '.';

const twoSeries: BarChartProps = {
  title: 'Income by month',
  periodLabel: 'Month',
  series: [
    { name: 'Visits', tone: 1 },
    { name: 'Subscriptions', tone: 2 },
  ],
  data: [
    { label: 'August 2026', tick: 'Aug', values: [120, 300] },
    { label: 'September 2026', tick: 'Sep', values: [90, 450] },
  ],
  format: (value) => `${String(value)} ILS`,
};

describe('BarChart', () => {
  it('holds every value of every series in its hidden table', () => {
    render(<BarChart {...twoSeries} />);

    const table = screen.getByRole('table', { name: 'Income by month' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Month', 'Visits', 'Subscriptions']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      'August 2026120 ILS300 ILS',
      'September 202690 ILS450 ILS',
    ]);
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['August 2026', 'September 2026']);
  });

  it('draws a legend only for more than one series', () => {
    const { container, rerender } = render(<BarChart {...twoSeries} />);
    const legend = container.querySelector('[data-slot="bar-chart-legend"]');
    expect(legend).toHaveTextContent('VisitsSubscriptions');

    rerender(
      <BarChart
        {...twoSeries}
        series={[{ name: 'Visits', tone: 1 }]}
        data={[{ label: 'August 2026', values: [120] }]}
      />,
    );
    expect(container.querySelector('[data-slot="bar-chart-legend"]')).toBeNull();
  });

  it('puts each tick, or else the label, under its bar', () => {
    const { container } = render(
      <BarChart
        {...twoSeries}
        data={[
          { label: 'August 2026', tick: 'Aug', values: [1, 2] },
          { label: 'Week 36', values: [3, 4] },
        ]}
      />,
    );

    expect(container.querySelector('[data-slot="bar-chart-ticks"]')?.textContent).toBe(
      'AugWeek 36',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BarChart {...twoSeries} size="sm" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
