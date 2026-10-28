import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { FilterTag } from '.';

describe('FilterTag', () => {
  it('shows its label, with a remove button named by the caller', () => {
    render(
      <FilterTag removeLabel="Remove the space filter" onRemove={() => {}}>
        Space: Nour Hub
      </FilterTag>,
    );

    expect(screen.getByText('Space: Nour Hub')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remove the space filter' })).toBeVisible();
  });

  it('removes the filter on a click and on Enter', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterTag removeLabel="Remove the field filter" onRemove={onRemove}>
        Field: Prices
      </FilterTag>,
    );
    const remove = screen.getByRole('button', { name: 'Remove the field filter' });

    await user.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);

    remove.focus();
    await user.keyboard('{Enter}');
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <FilterTag removeLabel="Remove the space filter" onRemove={() => {}}>
          Space: Nour Hub
        </FilterTag>
        <FilterTag removeLabel="Remove the field filter" onRemove={() => {}}>
          Field: Prices
        </FilterTag>
      </div>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
