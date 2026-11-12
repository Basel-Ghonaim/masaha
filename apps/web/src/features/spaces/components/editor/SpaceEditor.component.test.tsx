import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { bodyOf, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { NEW_SPACE, NOW, SPACE, renderProfile, sectionOf } from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

/** The eight sections, in the public page's order (G2). */
const SECTIONS = [
  'Photos',
  'Published prices',
  'Opening hours',
  'Shifts',
  'Amenities',
  'About the space',
  'Location',
  'Contacts',
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  // The toasts' store outlives a test's render.
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the space profile, view first', () => {
  it('shows it is loading, then the eight sections in the public page’s order', async () => {
    renderProfile();

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Photos' });
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings.slice(1)).toEqual(SECTIONS);
  });

  it('shows each section’s facts as a visitor sees them, with no field to edit', async () => {
    renderProfile({ owner: true });
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });

    expect(screen.queryAllByRole('textbox')).toEqual([]);
    expect(screen.queryAllByRole('combobox')).toEqual([]);
    expect(within(sectionOf('Published prices')).getByRole('table')).toHaveTextContent('Daily');
    expect(within(sectionOf('Opening hours')).getByText('Saturday – Thursday')).toBeInTheDocument();
    expect(within(sectionOf('Shifts')).getByText('Morning')).toBeInTheDocument();
    expect(within(sectionOf('Amenities')).getByText('Internet')).toBeInTheDocument();
    expect(within(sectionOf('Amenities')).getByText('Library')).toBeInTheDocument();
    expect(within(sectionOf('About the space')).getByText('فوكس هب')).toHaveAttribute('lang', 'ar');
    expect(within(sectionOf('Location')).getByText('Al-Nasr Street')).toBeInTheDocument();
    expect(within(sectionOf('Contacts')).getByRole('link', { name: /ديسكورد/ })).toHaveAttribute(
      'href',
      'https://discord.gg/focushub',
    );
  });

  it('names each section’s «تعديل» for the section, and gives no section its own Save', async () => {
    renderProfile({ owner: true });
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });

    for (const name of SECTIONS.slice(1)) {
      expect(
        within(sectionOf(name)).getByRole('button', { name: `Edit ${name}` }),
      ).toHaveTextContent('Edit');
    }
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(
      within(sectionOf('Photos')).getByRole('button', { name: 'Manage photos' }),
    ).toBeVisible();
  });

  it('says what each empty section lacks, with the action that adds it', async () => {
    renderProfile({
      owner: true,
      read: () => ok({ ...NEW_SPACE, isVerified: true }),
      photos: () => ok([]),
    });
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });

    const empty: [string, string, string][] = [
      ['Photos', 'No photos yet.', 'Add photos'],
      ['Published prices', 'No prices yet.', 'Add a price'],
      ['Opening hours', 'Opening hours aren’t available.', 'Add the opening hours'],
      ['Shifts', 'Add the opening hours first, then the shifts.', 'Add the opening hours'],
      ['Amenities', 'No amenities yet.', 'Add the amenities'],
      ['Contacts', 'No contacts yet. Visitors won’t find a way to reach you.', 'Add a contact'],
    ];
    for (const [name, text, action] of empty) {
      const section = sectionOf(name);
      expect(within(section).getByText(text)).toBeInTheDocument();
      expect(within(section).getByRole('button', { name: action })).toBeInTheDocument();
      expect(within(section).queryByRole('button', { name: `Edit ${name}` })).toBeNull();
    }
    // «عن المساحة» without its Arabic description says what that costs, and offers its Sheet.
    expect(
      within(sectionOf('About the space')).getByText(/No Arabic description yet\./),
    ).toBeInTheDocument();
  });

  it('says the shifts are optional once the hours are saved, with «إضافة وردية»', async () => {
    renderProfile({
      read: () => ok({ ...SPACE, hours: { days: SPACE.hours?.days ?? [], shifts: [] } }),
    });
    const shifts = await screen.findByRole('heading', { level: 2, name: 'Shifts' });

    const section = shifts.closest('[data-slot=card]') as HTMLElement;
    expect(within(section).getByText('No shifts.')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Add a shift' })).toBeInTheDocument();
  });

  it('keeps an empty-saved group’s date, so «none» reads as a choice (DI-8)', async () => {
    renderProfile({ read: () => ok({ ...SPACE, prices: [] }) });
    await screen.findByRole('heading', { level: 2, name: 'Published prices' });

    const prices = sectionOf('Published prices');
    expect(within(prices).getByText('Updated 3 days ago')).toBeInTheDocument();
    expect(within(prices).getByText('No prices yet.')).toBeInTheDocument();
  });

  it('marks today on the week, on Gaza’s calendar', async () => {
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });

    const row = within(sectionOf('Opening hours')).getByText('Today').closest('div');
    expect(row).toHaveTextContent('Saturday – Thursday');
  });

  it('leads the owner to a closure announcement from the hours (DI-5)', async () => {
    renderProfile({ owner: true });
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });

    expect(
      within(sectionOf('Opening hours')).getByRole('link', {
        name: 'Add a closure announcement in Announcements',
      }),
    ).toHaveAttribute('href', '/announcements');
  });

  it('shows a page’s notice inside its section', async () => {
    renderProfile({
      noticeFor: (section) => (section === 'location' ? <p>A report on the place</p> : null),
    });
    await screen.findByRole('heading', { level: 2, name: 'Location' });

    expect(within(sectionOf('Location')).getByText('A report on the place')).toBeInTheDocument();
    expect(screen.getAllByText('A report on the place')).toHaveLength(1);
  });

  it('has no detectable accessibility violations, in Arabic and in English', async () => {
    const { container, unmount } = renderProfile({ owner: true });
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });
    expect(await axe(container)).toHaveNoViolations();
    unmount();

    startPreferences('ar');
    const arabic = renderProfile({ owner: true });
    await screen.findByRole('heading', { level: 2, name: 'التواصل' });
    expect(await axe(arabic.container)).toHaveNoViolations();
  });
});

describe('the header', () => {
  it('names the space, its area and that it is verified, with the public page and its link', async () => {
    renderProfile({ owner: true });
    const name = await screen.findByRole('heading', { level: 2, name: 'Focus Hub' });

    const header = name.closest('[data-slot=card]') as HTMLElement;
    expect(within(header).getByText('Area 11, Gaza')).toBeInTheDocument();
    expect(within(header).getByText('Verified')).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'View public page' })).toHaveAttribute(
      'href',
      '/spaces/focus-hub',
    );
    expect(within(header).queryByRole('button', { name: /Edit/ })).toBeNull();
  });

  it('counts the sections filled on its meter, and links what is still to do', async () => {
    renderProfile({ read: () => ok({ ...NEW_SPACE, descriptionAr: 'وصف' }), photos: () => ok([]) });
    const meter = await screen.findByRole('meter', { name: 'Profile completeness' });

    expect(meter).toHaveAttribute('aria-valuetext', '2 of 7 sections');
    const todo = screen.getByRole('navigation', { name: 'Still to do' });
    expect(within(todo).getByRole('link', { name: 'Photos: not added yet' })).toHaveAttribute(
      'href',
      '/spaces/7#photos',
    );
    expect(
      within(todo)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Photos: not added yet',
      'Published prices: not added yet',
      'Opening hours: not added yet',
      'Amenities: not added yet',
      'Contacts: not added yet',
    ]);
  });

  it('counts «عن المساحة» only once it has an Arabic description (X2)', async () => {
    renderProfile({
      read: () => ok({ ...SPACE, descriptionAr: null, descriptionEn: 'A quiet place.' }),
    });
    const meter = await screen.findByRole('meter', { name: 'Profile completeness' });

    expect(meter).toHaveAttribute('aria-valuetext', '6 of 7 sections');
    expect(
      screen.getByRole('link', { name: 'About the space: not added yet' }),
    ).toBeInTheDocument();
  });

  it('says a stale section may be out of date', async () => {
    renderProfile({ read: () => ok({ ...SPACE, staleGroups: ['contacts'] }) });
    expect(
      await screen.findByRole('link', { name: 'Contacts: may be out of date' }),
    ).toBeInTheDocument();
  });

  it('says a complete and fresh profile is so', async () => {
    renderProfile();

    expect(await screen.findByText('The profile is complete and up to date')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Profile completeness' })).toHaveAttribute(
      'aria-valuetext',
      '7 of 7 sections',
    );
  });

  it('waits for the gallery before it counts (DI-4)', async () => {
    let answer: (value: ReturnType<typeof ok>) => void = () => undefined;
    renderProfile({
      photos: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    });
    await screen.findByRole('heading', { level: 2, name: 'Focus Hub' });

    expect(screen.queryByRole('meter', { name: 'Profile completeness' })).toBeNull();
    answer(ok([]));
    expect(await screen.findByRole('meter', { name: 'Profile completeness' })).toHaveAttribute(
      'aria-valuetext',
      '6 of 7 sections',
    );
  });

  it('says it cannot count while the gallery has failed, and counts once «إعادة المحاولة» reads it (DI-4)', async () => {
    const user = userEvent.setup();
    let failing = true;
    renderProfile({ photos: () => (failing ? refused(403, { type: 'forbidden' }) : ok([])) });
    const header = (await screen.findByRole('heading', { level: 2, name: 'Focus Hub' })).closest(
      '[data-slot=card]',
    ) as HTMLElement;

    expect(
      await within(header).findByText('We couldn’t count the profile: the photos didn’t load'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: 'Profile completeness' })).toBeNull();
    failing = false;
    await user.click(within(header).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('meter', { name: 'Profile completeness' })).toHaveAttribute(
      'aria-valuetext',
      '6 of 7 sections',
    );
  });

  it('puts the public page’s address on the clipboard on «نسخ الرابط», and says so', async () => {
    const user = userEvent.setup();
    renderProfile({ owner: true });
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/spaces/focus-hub`);
    expect(await findToast('Public page link copied')).toBeInTheDocument();
  });

  it('shows the link to copy by hand when the clipboard refuses', async () => {
    const user = userEvent.setup();
    renderProfile({ owner: true });
    await screen.findByRole('button', { name: 'Copy link' });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await findToast('We couldn’t copy the link. Copy it from here:')).toBeInTheDocument();
    expect(screen.getByText(/\/spaces\/focus-hub/)).toBeInTheDocument();
  });

  it('shows the letter tile without a photo, and «أضف صورة غلاف» opens the photos with the focus on «اختر صورًا»', async () => {
    const user = userEvent.setup();
    renderProfile({ owner: true, photos: () => ok([]) });
    const header = (await screen.findByRole('heading', { level: 2, name: 'Focus Hub' })).closest(
      '[data-slot=card]',
    ) as HTMLElement;
    expect(within(header).getByText('F')).toHaveAttribute('lang', 'en');
    expect(header.querySelector('img')).toBeNull();
    await user.click(within(header).getByRole('button', { name: 'Add a cover photo' }));

    expect(
      within(sectionOf('Photos')).getByRole('button', { name: 'Choose photos' }),
    ).toHaveFocus();
    expect(within(sectionOf('Photos')).getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('the index', () => {
  it('lists the sections beside them from 1024 px, each state said and the one in view marked', async () => {
    stubScreenWidth(1440);
    renderProfile({ read: () => ok({ ...SPACE, staleGroups: ['hours'], contacts: [] }) });
    const index = await screen.findByRole('navigation', { name: 'Profile sections' });

    const links = within(index).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'PhotosComplete',
      'Published pricesComplete',
      'Opening hoursMay be out of date',
      'ShiftsMay be out of date',
      'AmenitiesComplete',
      'About the spaceComplete',
      'LocationComplete',
      'ContactsNot added yet',
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'location');
    expect(links[0]).toHaveAttribute('href', '/spaces/7#photos');
  });

  it('draws no index below 1024 px', async () => {
    stubScreenWidth(900);
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Photos' });

    expect(screen.queryByRole('navigation', { name: 'Profile sections' })).toBeNull();
  });
});

describe('a stale group', () => {
  it('says so on both sections of its pair, and «ما زالت صحيحة» confirms the group once', async () => {
    const user = userEvent.setup();
    const { writes } = renderProfile({
      read: () => ok({ ...SPACE, staleGroups: ['profile'] }),
      write: () => ok(SPACE),
    });
    await screen.findByRole('heading', { level: 2, name: 'Location' });

    for (const name of ['About the space', 'Location']) {
      expect(within(sectionOf(name)).getByText('May be out of date')).toBeInTheDocument();
    }
    expect(within(sectionOf('Contacts')).queryByText('May be out of date')).toBeNull();
    await user.click(within(sectionOf('Location')).getByRole('button', { name: 'Still correct' }));

    await waitFor(() => {
      expect(within(sectionOf('About the space')).queryByText('May be out of date')).toBeNull();
    });
    expect(within(sectionOf('Location')).queryByText('May be out of date')).toBeNull();
    expect(writes().map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /admin/spaces/7/profile/confirm',
    ]);
    expect(await findToast('Location confirmed as still correct')).toBeInTheDocument();
  });

  it('offers no «ما زالت صحيحة» on a fresh group (SD7)', async () => {
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Location' });

    expect(screen.queryByRole('button', { name: 'Still correct' })).toBeNull();
  });
});

describe('the admin’s page', () => {
  it('marks an unverified space so, and a hidden one, with no alert, the owners’ link in the header', async () => {
    const { owned } = renderProfile({ read: () => ok({ ...SPACE, isHidden: true }) });
    const name = await screen.findByRole('heading', { level: 2, name: 'Focus Hub' });

    const header = name.closest('[data-slot=card]') as HTMLElement;
    expect(within(header).getByText('Unverified')).toBeInTheDocument();
    expect(within(header).getByText('Hidden from visitors')).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'Owners’ actions' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(owned.at(-1)).toMatchObject({ id: 7, isVerified: false });
  });

  it('shows a verified space as a visitor sees it, with no edit, its notice naming its owners', async () => {
    renderProfile({
      read: () =>
        ok({
          ...SPACE,
          isVerified: true,
          owners: [{ id: 5, name: 'Lina' }],
          staleGroups: ['contacts'],
        }),
    });
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });

    expect(screen.queryAllByRole('button', { name: /^Edit / })).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Still correct' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage photos' })).toBeNull();
    expect(screen.getByText(/Edited by/)).toHaveTextContent('Lina');
    expect(screen.getByRole('link', { name: /Focus Hub.’s reports/ })).toHaveAttribute(
      'href',
      '/reports?space=7',
    );
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText(/A space’s operating data is private/)).toBeInTheDocument();
  });

  it('refuses an owner a space they may not edit', async () => {
    renderProfile({ owner: true, read: () => ok(SPACE) });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'You don’t have access to this page' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Photos' })).toBeNull();
  });

  it('shows the 404 for a space that is gone', async () => {
    renderProfile({ read: () => refused(404, { type: 'not_found' }) });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});

describe('the requests', () => {
  it('reads the admin’s space and gallery on the admin’s routes, an owner’s on the managed ones', async () => {
    const admin = renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Photos' });
    expect(admin.requests.map(({ url }) => url)).toEqual([
      '/admin/spaces/7',
      '/admin/spaces/7/photos',
    ]);
    admin.unmount();

    const owner = renderProfile({ owner: true });
    await screen.findByRole('heading', { level: 2, name: 'Photos' });
    expect(owner.requests.map(({ url }) => url)).toEqual([
      '/manage/spaces/7',
      '/manage/spaces/7/photos',
    ]);
    expect(bodyOf(owner.requests[0])).toBeUndefined();
  });
});

describe('every Sheet', () => {
  /** Each section's «تعديل» and its Sheet's title, in a language. */
  const SHEETS = {
    en: [
      ['Edit Published prices', 'Edit the published prices'],
      ['Edit Opening hours', 'Edit the opening hours'],
      ['Edit Shifts', 'Edit the shifts'],
      ['Edit Amenities', 'Edit the amenities'],
      ['Edit About the space', 'Edit: about the space'],
      ['Edit Location', 'Edit the location'],
      ['Edit Contacts', 'Edit the contacts'],
    ],
    ar: [
      ['تعديل الأسعار المعلنة', 'تعديل الأسعار المعلنة'],
      ['تعديل ساعات العمل', 'تعديل ساعات العمل'],
      ['تعديل الورديات', 'تعديل الورديات'],
      ['تعديل المرافق', 'تعديل المرافق'],
      ['تعديل عن المساحة', 'تعديل: عن المساحة'],
      ['تعديل الموقع', 'تعديل الموقع'],
      ['تعديل التواصل', 'تعديل التواصل'],
    ],
  } as const;

  for (const language of ['en', 'ar'] as const) {
    it(`has no detectable accessibility violations open, each in turn (${language})`, async () => {
      startPreferences(language);
      const user = userEvent.setup({ delay: null });
      renderProfile();
      for (const [edit, title] of SHEETS[language]) {
        await user.click(await screen.findByRole('button', { name: edit }));
        const sheet = await screen.findByRole('dialog', { name: title });
        expect(await axe(document.body)).toHaveNoViolations();
        await user.click(
          within(sheet).getAllByRole('button', {
            name: language === 'en' ? 'Back' : 'رجوع',
          })[1] as HTMLElement,
        );
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBeNull();
        });
      }
    }, 60_000); // Seven Sheets, each drawn and checked whole: longer than one test's 5 s.
  }
});
