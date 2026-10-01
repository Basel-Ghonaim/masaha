import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ToggleGroup, ToggleGroupItem } from '.';
import { DirectionProvider } from '../../../lib/DirectionProvider';
import { Field } from '../Field';

const STATUSES = [
  { value: 'new', label: 'New reports' },
  { value: 'review', label: 'Reports in review' },
  { value: 'corrected', label: 'Corrected reports' },
];

function StatusChips({ defaultValue = [] }: { defaultValue?: string[] }) {
  return (
    <Field label="Report status" helper="Choose any number">
      <ToggleGroup type="multiple" defaultValue={defaultValue}>
        {STATUSES.map((status) => (
          <ToggleGroupItem key={status.value} value={status.value}>
            {status.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

describe('ToggleGroup', () => {
  it('is named and described by its Field', () => {
    render(<StatusChips />);

    expect(screen.getByRole('toolbar', { name: 'Report status' })).toHaveAccessibleDescription(
      'Choose any number',
    );
  });

  it('turns several chips on at once, and off again', async () => {
    render(<StatusChips />);
    const fresh = screen.getByRole('button', { name: 'New reports' });
    const review = screen.getByRole('button', { name: 'Reports in review' });

    await userEvent.click(fresh);
    await userEvent.click(review);

    expect(fresh).toHaveAttribute('aria-pressed', 'true');
    expect(review).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(fresh);

    expect(fresh).toHaveAttribute('aria-pressed', 'false');
    expect(review).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps at most one chip on as a single group', async () => {
    render(
      <ToggleGroup type="single" aria-label="Report status" defaultValue="new">
        <ToggleGroupItem value="new">New reports</ToggleGroupItem>
        <ToggleGroupItem value="review">Reports in review</ToggleGroupItem>
      </ToggleGroup>,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Reports in review' }));

    expect(screen.getByRole('radio', { name: 'Reports in review' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'New reports' })).not.toBeChecked();
  });

  it('shows a check only on the chips that are on', () => {
    render(<StatusChips defaultValue={['review']} />);

    expect(screen.getByRole('button', { name: 'Reports in review' })).toHaveAttribute(
      'data-state',
      'on',
    );
    expect(screen.getByRole('button', { name: 'New reports' })).toHaveAttribute(
      'data-state',
      'off',
    );
  });

  it.each([
    { dir: 'ltr' as const, key: 'ArrowRight' },
    { dir: 'rtl' as const, key: 'ArrowLeft' },
  ])('moves to the next chip with $key in $dir', async ({ dir, key }) => {
    render(
      <DirectionProvider dir={dir}>
        <StatusChips />
      </DirectionProvider>,
    );

    await userEvent.tab();
    await userEvent.keyboard(`{${key}}`);

    expect(screen.getByRole('button', { name: 'Reports in review' })).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StatusChips defaultValue={['new', 'review']} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
