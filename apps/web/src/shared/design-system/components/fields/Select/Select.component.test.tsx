import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '.';
import { Field } from '../Field';

function AreaField({ disabled = false, error }: { disabled?: boolean; error?: string }) {
  return (
    <Field label="Area" helper="Where the space is" error={error}>
      <Select disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Choose an area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rimal">Rimal</SelectItem>
          <SelectItem value="tal-al-hawa">Tal al-Hawa</SelectItem>
          <SelectItem value="nuseirat" disabled>
            Nuseirat
          </SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

describe('Select', () => {
  it('takes its label, description and error from a Field', () => {
    render(<AreaField error="Choose where the space is" />);
    const trigger = screen.getByRole('combobox', { name: 'Area' });

    expect(trigger).toHaveAccessibleDescription('Choose where the space is Where the space is');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
  });

  it('opens from the keyboard, chooses an item and returns focus to the trigger', async () => {
    render(<AreaField />);
    const trigger = screen.getByRole('combobox', { name: 'Area' });

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Tal al-Hawa');
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape without choosing', async () => {
    render(<AreaField />);
    const trigger = screen.getByRole('combobox', { name: 'Area' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Choose an area');
    expect(trigger).toHaveFocus();
  });

  it('skips a disabled item', async () => {
    render(<AreaField />);
    const trigger = screen.getByRole('combobox', { name: 'Area' });

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    expect(trigger).toHaveTextContent('Tal al-Hawa');
  });

  it('does not open while disabled', async () => {
    render(<AreaField disabled />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AreaField error="Choose where the space is" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
