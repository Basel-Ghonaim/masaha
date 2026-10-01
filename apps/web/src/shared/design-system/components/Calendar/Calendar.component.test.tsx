import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Calendar, type CalendarProps } from '.';
import { DirectionProvider } from '../../lib/DirectionProvider';

// 28 September 2026 is a Monday.
const MONTH = new Date(2026, 8, 1);
const DAY = new Date(2026, 8, 28);

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type TestCalendarProps = DistributiveOmit<
  CalendarProps,
  'lang' | 'previousMonthLabel' | 'nextMonthLabel'
> & { lang?: CalendarProps['lang'] };

function MembershipCalendar(props: TestCalendarProps) {
  return (
    <Calendar
      lang="en"
      defaultMonth={MONTH}
      previousMonthLabel="Show the previous month"
      nextMonthLabel="Show the next month"
      {...props}
    />
  );
}

// day-picker hides the short weekday headers from assistive technology and names each column by
// the full day name.
function firstWeekday() {
  return screen.getByRole('grid').querySelector('thead th')?.getAttribute('aria-label');
}

describe('Calendar', () => {
  it('names its month buttons from props and holds no words of its own', () => {
    render(<MembershipCalendar mode="single" lang="ar" />);

    expect(screen.getByRole('button', { name: 'Show the previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show the next month' })).toBeInTheDocument();
    // day-picker's Arabic locale would name the navigation «شريط التنقل».
    expect(screen.queryByLabelText('شريط التنقل')).not.toBeInTheDocument();
  });

  it('shows Arabic month names with Western digits, and starts the week on Saturday', () => {
    render(<MembershipCalendar mode="single" lang="ar" />);

    expect(screen.getByRole('grid', { name: 'سبتمبر 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /28 سبتمبر 2026/ })).toHaveTextContent('28');
    expect(firstWeekday()).toBe('السبت');
  });

  it('shows English month names and starts the week on Sunday', () => {
    render(<MembershipCalendar mode="single" lang="en" />);

    expect(screen.getByRole('grid', { name: 'September 2026' })).toBeInTheDocument();
    expect(firstWeekday()).toBe('Sunday');
  });

  it('names a day by its date only, and marks today and the chosen day without words', () => {
    vi.useFakeTimers({ now: DAY, toFake: ['Date'] });
    render(<MembershipCalendar mode="single" selected={DAY} />);
    vi.useRealTimers();
    const day = screen.getByRole('button', { name: 'Monday, September 28th, 2026' });

    expect(day).toHaveAttribute('aria-current', 'date');
    expect(day.closest('[role=gridcell]')).toHaveAttribute('aria-selected', 'true');
  });

  it('chooses a day when it is clicked', async () => {
    const onSelect = vi.fn();
    render(<MembershipCalendar mode="single" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Monday, September 28th, 2026' }));

    expect(onSelect).toHaveBeenCalledWith(DAY, DAY, expect.anything(), expect.anything());
  });

  it.each([
    { dir: 'ltr' as const, key: 'ArrowRight' },
    { dir: 'rtl' as const, key: 'ArrowLeft' },
  ])(
    'moves to the next day with $key in $dir, with the previous month at the start',
    async ({ dir, key }) => {
      render(
        <DirectionProvider dir={dir}>
          <MembershipCalendar mode="single" selected={DAY} />
        </DirectionProvider>,
      );
      const previous = screen.getByRole('button', { name: 'Show the previous month' });

      // The previous-month chevron points to the start side: flipped in RTL.
      expect(previous.querySelector('svg')?.classList.contains('-scale-x-100')).toBe(dir === 'rtl');

      await userEvent.click(screen.getByRole('button', { name: 'Monday, September 28th, 2026' }));
      await userEvent.keyboard(`{${key}}`);

      expect(screen.getByRole('button', { name: 'Tuesday, September 29th, 2026' })).toHaveFocus();
    },
  );

  it('shows the next month when its button is pressed', async () => {
    render(<MembershipCalendar mode="single" />);

    await userEvent.click(screen.getByRole('button', { name: 'Show the next month' }));

    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
  });

  it('marks the ends and the inside of a range', () => {
    render(
      <MembershipCalendar
        mode="range"
        selected={{ from: new Date(2026, 8, 7), to: new Date(2026, 8, 9) }}
      />,
    );
    const grid = screen.getByRole('grid');

    expect(within(grid).getByRole('button', { name: /September 7th/ })).toHaveAttribute(
      'data-range-start',
    );
    expect(within(grid).getByRole('button', { name: /September 8th/ })).toHaveAttribute(
      'data-range-middle',
    );
    expect(within(grid).getByRole('button', { name: /September 9th/ })).toHaveAttribute(
      'data-range-end',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MembershipCalendar mode="single" lang="ar" selected={DAY} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
