import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { SegmentedControl, SegmentedControlItem } from '.';
import { DirectionProvider } from '../../../lib/DirectionProvider';
import { Field } from '../Field';

const VIEWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

/** A controlled control in its Field, as a caller holds it, in a direction. */
function ViewField({ dir = 'ltr', initial = 'day' }: { dir?: 'ltr' | 'rtl'; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <DirectionProvider dir={dir}>
      <Field label="Calendar view" helper="Changes what the calendar shows">
        <SegmentedControl value={value} onValueChange={setValue}>
          {VIEWS.map((view) => (
            <SegmentedControlItem key={view.value} value={view.value}>
              {view.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Field>
      <button type="button">After</button>
    </DirectionProvider>
  );
}

const segment = (name: string) => screen.getByRole('radio', { name });

describe('SegmentedControl', () => {
  it('is a radiogroup named and described by its Field, its segments radios', () => {
    render(<ViewField />);
    const group = screen.getByRole('radiogroup', { name: 'Calendar view' });

    expect(group).toHaveAccessibleDescription('Changes what the calendar shows');
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      'Day',
      'Week',
      'Month',
    ]);
    expect(segment('Day')).toHaveAttribute('aria-checked', 'true');
    expect(segment('Week')).toHaveAttribute('aria-checked', 'false');
  });

  it('chooses a segment when it is clicked', async () => {
    render(<ViewField />);

    await userEvent.click(segment('Month'));

    expect(segment('Month')).toBeChecked();
    expect(segment('Day')).not.toBeChecked();
  });

  it('enters on the chosen segment and leaves on the next Tab: one tab stop', async () => {
    render(<ViewField initial="week" />);

    await userEvent.tab();
    expect(segment('Week')).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it.each([
    { dir: 'ltr' as const, next: 'ArrowRight', back: 'ArrowLeft' },
    { dir: 'rtl' as const, next: 'ArrowLeft', back: 'ArrowRight' },
  ])('in $dir, $next chooses the next segment and $back the one before', async (keys) => {
    render(<ViewField dir={keys.dir} />);

    await userEvent.tab();
    // Held, as a real key press is: Radix moves the focus a tick later, and chooses the segment it
    // lands on only while an arrow key is down.
    await userEvent.keyboard(`{${keys.next}>}{/${keys.next}}`);
    expect(segment('Week')).toBeChecked();
    expect(segment('Week')).toHaveFocus();

    await userEvent.keyboard(`{${keys.back}>}{/${keys.back}}`);
    expect(segment('Day')).toBeChecked();
    expect(segment('Day')).toHaveFocus();
  });

  it('loops at the ends', async () => {
    render(<ViewField />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft>}{/ArrowLeft}');
    expect(segment('Month')).toBeChecked();

    await userEvent.keyboard('{ArrowRight>}{/ArrowRight}');
    expect(segment('Day')).toBeChecked();
  });

  it('chooses the last segment with End and the first with Home', async () => {
    render(<ViewField dir="rtl" initial="week" />);

    await userEvent.tab();
    await userEvent.keyboard('{End}');
    expect(segment('Month')).toBeChecked();
    expect(segment('Month')).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(segment('Day')).toBeChecked();
    expect(segment('Day')).toHaveFocus();
  });

  it.each(['ltr', 'rtl'] as const)('has no accessibility violations in %s', async (dir) => {
    const { container } = render(<ViewField dir={dir} initial="month" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
