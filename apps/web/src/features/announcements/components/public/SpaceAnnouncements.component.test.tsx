import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { publicAnnouncement } from '../../../../test/announcement';
import { startPreferences } from '../../../../test/startPreferences';
import { SpaceAnnouncements } from './SpaceAnnouncements';

// 10:00 in Gaza, 21 October 2026: the closure runs since 08:00.
const CLOSURE = publicAnnouncement({
  id: 3,
  type: 'CLOSURE',
  textEn: 'Closed for maintenance',
  endsAt: '2026-10-21T15:00:00.000Z',
});
const OFFER = publicAnnouncement({
  id: 4,
  type: 'OFFER',
  textAr: 'خصم الطلاب',
  textEn: null,
  startsAt: '2026-10-23T06:00:00.000Z',
});
const GENERAL = publicAnnouncement({
  id: 5,
  textEn: 'New chairs',
  startsAt: '2026-10-20T06:00:00.000Z',
});
const UPCOMING_CLOSURE = publicAnnouncement({
  id: 6,
  type: 'CLOSURE',
  textEn: 'Closed for the holiday',
  startsAt: '2026-10-25T06:00:00.000Z',
});

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T07:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SpaceAnnouncements', () => {
  it('lists the others by their start, the running closure not repeated, an upcoming closure among them', async () => {
    const { container } = render(
      <SpaceAnnouncements items={[OFFER, CLOSURE, UPCOMING_CLOSURE, GENERAL]} />,
    );

    const section = screen.getByRole('region', { name: 'Announcements' });
    const texts = within(section)
      .getAllByRole('listitem')
      .map((row) => row.querySelector('p')?.textContent);
    expect(texts).toEqual(['New chairs', 'خصم الطلاب', 'Closed for the holiday']);
    expect(within(section).queryByText('Closed for maintenance')).not.toBeInTheDocument();
    expect(within(section).getAllByText('Temporary closure')).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('marks the Arabic text, shown when an English one is missing, as Arabic', () => {
    render(<SpaceAnnouncements items={[OFFER]} />);

    const text = screen.getByText('خصم الطلاب');
    expect(text).toHaveAttribute('lang', 'ar');
    expect(text).toHaveAttribute('dir', 'rtl');
  });

  it('draws nothing when only the running closure, or nothing, is left', () => {
    const { container, rerender } = render(<SpaceAnnouncements items={[CLOSURE]} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<SpaceAnnouncements items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
