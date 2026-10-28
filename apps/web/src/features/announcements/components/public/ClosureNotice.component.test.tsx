import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { publicAnnouncement } from '../../../../test/announcement';
import { startPreferences } from '../../../../test/startPreferences';
import { ClosureNotice } from './ClosureNotice';

// 10:00 in Gaza, 21 October 2026: the closure runs 08:00–18:00.
const CLOSURE = publicAnnouncement({
  id: 3,
  type: 'CLOSURE',
  textAr: 'مغلق للصيانة',
  textEn: null,
  endsAt: '2026-10-21T15:00:00.000Z',
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T07:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ClosureNotice', () => {
  it('shows the running closure as a warning: its text, then who said it and its period on Gaza’s clock', async () => {
    startPreferences('ar');
    const { container } = render(
      <ClosureNotice items={[publicAnnouncement({ id: 2, type: 'OFFER' }), CLOSURE]} />,
    );

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('مغلق للصيانة');
    expect(notice).toHaveTextContent(/إعلان من إدارة المساحة · 21 أكتوبر .08:00.–.18:00./u);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('marks the Arabic text, shown in English when an English one is missing, as Arabic', () => {
    startPreferences('en');
    render(<ClosureNotice items={[CLOSURE]} />);

    const title = screen.getByText('مغلق للصيانة');
    expect(title).toHaveAttribute('lang', 'ar');
    expect(screen.getByRole('status')).toHaveTextContent(
      /An announcement from the space · 21 October .08:00.–.18:00./u,
    );
  });

  it('shows nothing without a running closure: an upcoming one, or one already ended', () => {
    startPreferences('en');
    const { container } = render(
      <ClosureNotice
        items={[
          { ...CLOSURE, startsAt: '2026-10-22T05:00:00.000Z', endsAt: null },
          {
            ...CLOSURE,
            id: 4,
            startsAt: '2026-10-20T05:00:00.000Z',
            endsAt: '2026-10-21T06:00:00.000Z',
          },
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
