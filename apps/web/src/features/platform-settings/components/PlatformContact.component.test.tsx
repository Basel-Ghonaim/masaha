import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { startPreferences } from '../../../test/startPreferences';
import { PlatformContact } from './PlatformContact';

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('PlatformContact', () => {
  it('with only the email set, offers the email alone; with none, shows its `none`', async () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'team@example.com');
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '');
    const { container, unmount } = render(
      <PlatformContact layout="column" none={<p>لا توجد وسيلة</p>} />,
    );

    const email = screen.getByRole('link', { name: 'بريد team@example.com' });
    expect(email).toHaveAttribute('href', 'mailto:team@example.com');
    expect(email).not.toHaveAttribute('target');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText('لا توجد وسيلة')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    unmount();

    vi.stubEnv('VITE_CONTACT_EMAIL', '');
    render(<PlatformContact layout="column" none={<p>لا توجد وسيلة</p>} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('لا توجد وسيلة')).toBeInTheDocument();
  });

  it('offers WhatsApp first, in a new tab, its number left to right, then the email', () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'team@example.com');
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '0599 000 099');
    render(<PlatformContact layout="row" />);

    const [whatsapp, email] = screen.getAllByRole('link');
    expect(whatsapp).toHaveAccessibleName('واتساب +970599000099');
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/970599000099');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener');
    expect(screen.getByText('+970599000099')).toHaveAttribute('dir', 'ltr');
    expect(email).toHaveAccessibleName('بريد team@example.com');
  });
});
