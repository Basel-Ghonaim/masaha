import { createQueryClient } from '@shared/api';
import { restoreSession } from '@shared/session';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { warm } from '../../../../test/warmLazy';
import { siteRoutes } from '../../routes';

/** The site's routes, as the app mounts them, at `path`, over `client`; returns the router. */
function renderSite(path: string, client: QueryClient = createQueryClient()) {
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

// The lazy modules its tests open, loaded once before any test waits (src/test/warmLazy.ts).
beforeAll(
  () =>
    warm(
      () => import('../../shell/SiteLayout'),
      () => import('./PrivacyPage'),
    ),
  60_000,
);

/** A guest, in `language`, the server answering the platform's contact with `contact`. */
async function asGuest(
  language: 'ar' | 'en',
  contact: { email: string | null; whatsapp: string | null } = {
    email: 'team@example.com',
    whatsapp: '+970599000099',
  },
) {
  fakeTransport(() => ok(contact));
  startPreferences(language);
  setSessionHint(false);
  await restoreSession();
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the privacy page', () => {
  it('shows a guest its title, its date and every section, in English', async () => {
    await asGuest('en');
    const router = renderSite('/privacy');

    const main = within(await screen.findByRole('main'));
    expect(
      await main.findByRole('heading', { level: 1, name: 'Privacy Policy' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/privacy');
    expect(
      main.getByText(
        (_text, element) =>
          element?.tagName === 'P' && element.textContent.startsWith('Last updated:'),
      ),
    ).toHaveTextContent('Last updated: 2026-11-05');
    expect(main.getByText('Last updated:').tagName).toBe('STRONG');
    expect(
      main.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Introduction',
      'What we collect',
      "What we don't collect",
      'How we use your data',
      'Cookies and browser storage',
      'Who sees your data',
      'How we protect your data',
      'How long we keep data',
      'Your rights',
      'Changes to this policy',
      'Contact us',
    ]);
  });

  it('shows every section in Arabic, bold where the text is bold', async () => {
    await asGuest('ar');
    renderSite('/privacy');

    const main = within(await screen.findByRole('main'));
    expect(
      await main.findByRole('heading', { level: 1, name: 'سياسة الخصوصية' }),
    ).toBeInTheDocument();
    // The date is read left to right in the Arabic line, never shown as 05-11-2026.
    expect(main.getByText('2026-11-05')).toHaveAttribute('dir', 'ltr');
    expect(
      main.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'مقدمة',
      'البيانات التي نجمعها',
      'ما لا نجمعه',
      'كيف نستخدم بياناتك',
      'ملفات تعريف الارتباط (Cookies) والتخزين في المتصفح',
      'من يرى بياناتك',
      'كيف نحمي بياناتك',
      'مدة الاحتفاظ بالبيانات',
      'حقوقك',
      'التغييرات على هذه السياسة',
      'تواصل معنا',
    ]);
    expect(main.getByText('عند إنشاء حساب:').tagName).toBe('STRONG');
    const anonymous = main.getByText('دون اسمك');
    expect(anonymous.tagName).toBe('STRONG');
    expect(anonymous.closest('li')).toHaveTextContent(
      'البلاغات: يصل بلاغك عن مساحة إلى صاحبها دون اسمك.',
    );
    expect(main.getByText('يُوقَف الحساب ولا يُحذف').tagName).toBe('STRONG');
  });

  it('gives the platform’s email in its contact section, and only the email', async () => {
    await asGuest('en');
    renderSite('/privacy');

    const contact = within(await screen.findByRole('region', { name: 'Contact us' }));
    const email = await contact.findByRole('link', { name: 'Email team@example.com' });
    expect(email).toHaveAttribute('href', 'mailto:team@example.com');
    expect(email.closest('p')).toHaveTextContent(
      'For any question about your privacy: Email team@example.com.',
    );
    expect(contact.getAllByRole('link')).toHaveLength(1);
  });

  it('keeps the contact’s sentence, with no email link, when no contact is set', async () => {
    await asGuest('en', { email: null, whatsapp: null });
    const client = createQueryClient();
    renderSite('/privacy', client);

    const contact = within(await screen.findByRole('region', { name: 'Contact us' }));
    await waitFor(() => {
      expect(client.isFetching()).toBe(0);
    });
    expect(
      contact.getByText('For any question about your privacy:', { exact: false }),
    ).toBeInTheDocument();
    expect(contact.queryByRole('link')).not.toBeInTheDocument();
  });
});
