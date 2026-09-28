import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { DatePicker, DatePickerContent, DatePickerTrigger } from '.';
import { Calendar, type DateRange } from '../Calendar';
import { Field } from '../Field';

const MONTH = new Date(2026, 8, 1);
const LABELS = { previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month' };

// The caller formats the date and closes the picker once a choice is complete.
function StartDate() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();

  return (
    <Field label="Membership start" helper="The first day the member can come in">
      <DatePicker open={open} onOpenChange={setOpen}>
        <DatePickerTrigger empty={date === undefined}>
          {date === undefined ? 'Pick a date' : date.toLocaleDateString('en-GB')}
        </DatePickerTrigger>
        <DatePickerContent label="Choose the start date">
          <Calendar
            lang="en"
            mode="single"
            defaultMonth={MONTH}
            selected={date}
            onSelect={(next) => {
              setDate(next);
              setOpen(false);
            }}
            {...LABELS}
          />
        </DatePickerContent>
      </DatePicker>
    </Field>
  );
}

function ReportPeriod() {
  const [range, setRange] = useState<DateRange>();

  return (
    <DatePicker>
      <DatePickerTrigger className="w-auto">
        {range?.from === undefined
          ? 'Last 30 days'
          : `${String(range.from.getDate())}–${range.to === undefined ? '' : String(range.to.getDate())} September`}
      </DatePickerTrigger>
      <DatePickerContent label="Choose the report period">
        <Calendar
          lang="en"
          mode="range"
          defaultMonth={MONTH}
          selected={range}
          onSelect={setRange}
          {...LABELS}
        />
      </DatePickerContent>
    </DatePicker>
  );
}

describe('DatePicker', () => {
  it('is named by its Field label and its text, and described by the Field', () => {
    render(<StartDate />);
    const trigger = screen.getByRole('button', { name: 'Membership start Pick a date' });

    expect(trigger).toHaveAccessibleDescription('The first day the member can come in');
    expect(trigger).toHaveAttribute('data-empty');
  });

  it('opens a named calendar, and closes on a choice with the focus back on the trigger', async () => {
    render(<StartDate />);
    const trigger = screen.getByRole('button', { name: 'Membership start Pick a date' });

    await userEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Choose the start date' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Monday, September 28th, 2026' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveAccessibleName('Membership start 28/09/2026');
    expect(trigger).not.toHaveAttribute('data-empty');
    expect(trigger).toHaveFocus();
  });

  it('closes with Escape and returns the focus to the trigger', async () => {
    render(<StartDate />);
    const trigger = screen.getByRole('button', { name: 'Membership start Pick a date' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('chooses a range, named by its own text outside a Field', async () => {
    render(<ReportPeriod />);

    await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    await userEvent.click(screen.getByRole('button', { name: /September 7th/ }));
    await userEvent.click(screen.getByRole('button', { name: /September 9th/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7–9 September' })).toBeInTheDocument();
  });

  it('has no accessibility violations, closed or open', async () => {
    render(<StartDate />);
    // The calendar is portalled to <body>, so the whole body is checked. Landmarks belong to a
    // page, not to a component, so that rule is off.
    const options = { rules: { region: { enabled: false } } };

    expect(await axe(document.body, options)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('button', { name: 'Membership start Pick a date' }));

    expect(await axe(document.body, options)).toHaveNoViolations();
  });
});
