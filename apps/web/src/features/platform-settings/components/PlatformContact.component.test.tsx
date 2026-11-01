import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { PlatformContact } from './PlatformContact';

/** `ui` with the app's query client, the server answering the public contact with `answer`. */
function renderWith(answer: Parameters<typeof fakeTransport>[0], ui: ReactNode) {
  const requests = fakeTransport(answer);
  const view = render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
  return { ...view, requests };
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('PlatformContact', () => {
  it('the site’s contact comes from GET /settings/public: WhatsApp first, in a new tab, then the email; axe-clean', async () => {
    const { container, requests } = renderWith(
      () => ok({ email: 'team@example.com', whatsapp: '+970599000099' }),
      <PlatformContact layout="row" none={<p>لا توجد وسيلة</p>} />,
    );

    // Nothing while it is read (DI31): not even the caller's line.
    expect(screen.queryByText('لا توجد وسيلة')).not.toBeInTheDocument();
    const [whatsapp, email] = await screen.findAllByRole('link');
    expect(requests[0]?.url).toBe('/settings/public');
    expect(whatsapp).toHaveAccessibleName('واتساب +970599000099');
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/970599000099');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener');
    expect(screen.getByText('+970599000099')).toHaveAttribute('dir', 'ltr');
    expect(email).toHaveAccessibleName('بريد team@example.com');
    expect(email).toHaveAttribute('href', 'mailto:team@example.com');
    expect(email).not.toHaveAttribute('target');
    expect(screen.queryByText('لا توجد وسيلة')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('no contact set: the caller’s line', async () => {
    const { unmount } = renderWith(
      () => ok({ email: null, whatsapp: null }),
      <PlatformContact layout="column" none={<p>لا توجد وسيلة</p>} />,
    );
    expect(await screen.findByText('لا توجد وسيلة')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    unmount();
    restoreTransport();

    // A failed read is said as none set.
    renderWith(
      () => refused(403, { type: 'forbidden' }),
      <PlatformContact layout="column" none={<p>لا توجد وسيلة</p>} />,
    );
    expect(await screen.findByText('لا توجد وسيلة')).toBeInTheDocument();
  });

  it('with only the email set, offers the email alone', async () => {
    renderWith(
      () => ok({ email: 'team@example.com', whatsapp: null }),
      <PlatformContact layout="column" />,
    );
    const email = await screen.findByRole('link', { name: 'بريد team@example.com' });
    expect(email).toHaveAttribute('href', 'mailto:team@example.com');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
