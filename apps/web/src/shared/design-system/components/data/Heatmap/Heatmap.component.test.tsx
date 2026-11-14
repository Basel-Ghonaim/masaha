import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Heatmap, type HeatmapProps } from '.';

const sample: HeatmapProps = {
  title: 'Busy hours',
  unit: 'visits',
  columns: ['8', '9', '10'],
  rows: [
    { label: 'Saturday', values: [0, 4, 9] },
    { label: 'Sunday', values: [2, 7, 1] },
  ],
  fewer: 'Fewer',
  more: 'More',
  dayLabel: 'Day',
};

describe('Heatmap', () => {
  it('holds every cell in its hidden table, its caption the unit', () => {
    render(<Heatmap {...sample} />);

    const table = screen.getByRole('table', { name: 'Busy hours (visits)' });
    expect(table.className).not.toContain('sr-only');
    expect(table.parentElement).toHaveClass('sr-only');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Day', '8', '9', '10']);
    expect(
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(['Saturday049', 'Sunday271']);
  });

  it('shades each cell by its step, the darkest for the highest', () => {
    const { container } = render(<Heatmap {...sample} />);

    const fills = [...container.querySelectorAll('[data-slot="heatmap-cell"] > span')];
    expect(fills).toHaveLength(6);
    expect(fills[0]).toHaveClass('opacity-(--heatmap-step-1)');
    expect(fills[2]).toHaveClass('opacity-(--heatmap-step-5)');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Heatmap {...sample} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
