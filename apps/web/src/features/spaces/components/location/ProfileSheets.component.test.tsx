import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeGeolocation } from '../../../../test/fakeGeolocation';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { bodyOf, ok, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { NOW, SPACE, renderProfile, sectionOf, sheetOf } from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

// A Sheet's lists draw every option each time one opens (the time lists hold 48 half hours), which
// jsdom is slow at: a test that chooses several times outlasts 5 s on a busy machine, so this file
// allows each test longer.
vi.setConfig({ testTimeout: 15_000 });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type User = ReturnType<typeof userEvent.setup>;

async function open(user: User, section: string, title: string) {
  await user.click(await screen.findByRole('button', { name: section }));
  return sheetOf(title);
}

/** The page shown again past the half minute its reads stay fresh: the space is read again. */
function readAgain() {
  act(() => {
    vi.setSystemTime(Date.now() + 31_000);
    window.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('«عن المساحة»’s Sheet', () => {
  it('sends only its own changed fields, never the location’s (B2)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await open(user, 'Edit About the space', 'Edit: about the space');

    const description = within(sheet).getByRole('textbox', { name: 'Description in English' });
    await user.type(description, 'A quiet place.');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(writes()[0]?.method).toBe('patch');
    expect(bodyOf(writes()[0])).toEqual({ descriptionEn: 'A quiet place.' });
  });

  it('sends only what was typed once the space is read again with other fields changed (B2)', async () => {
    const user = userEvent.setup({ delay: null });
    let reads = 0;
    const { writes } = renderProfile({
      read: () => {
        reads += 1;
        // Another admin renamed the space in Arabic and moved its Arabic address meanwhile.
        return ok(
          reads === 1 ? SPACE : { ...SPACE, nameAr: 'فوكس هب ٢', addressAr: 'شارع عمر المختار' },
        );
      },
      write: () => ok(SPACE),
    });
    const sheet = await open(user, 'Edit About the space', 'Edit: about the space');
    readAgain();
    expect(await screen.findByText('شارع عمر المختار')).toBeInTheDocument();

    await user.type(
      within(sheet).getByRole('textbox', { name: 'Description in English' }),
      'A quiet place.',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ descriptionEn: 'A quiet place.' });
  });

  it('holds each text in its own language and direction, the slug note under the English name', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await open(user, 'Edit About the space', 'Edit: about the space');

    const arabic = within(sheet).getByRole('textbox', { name: 'Name in Arabic' });
    const english = within(sheet).getByRole('textbox', { name: 'Name in English' });
    expect(arabic).toHaveAttribute('lang', 'ar');
    expect(arabic).toHaveAttribute('dir', 'rtl');
    expect(english).toHaveAttribute('dir', 'ltr');
    expect(english).toHaveAccessibleDescription(
      'Changing the name doesn’t change your page’s link.',
    );
  });

  it('counts each description live, and refuses one past its limit on its field, never cutting it (DI-6)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await open(user, 'Edit About the space', 'Edit: about the space');
    const description = within(sheet).getByRole('textbox', { name: 'Description in English' });

    expect(description).toHaveAccessibleDescription('0 / 1000');
    await act(async () => {
      description.focus();
      await user.paste('x'.repeat(1001));
    });

    expect(description).toHaveValue('x'.repeat(1001));
    expect(description).toHaveAccessibleDescription('1001 / 1000');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByText('1000 characters at most')).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('has no detectable accessibility violations open, in Arabic too', async () => {
    const user = userEvent.setup({ delay: null });
    const english = renderProfile();
    await open(user, 'Edit About the space', 'Edit: about the space');
    expect(await axe(document.body)).toHaveNoViolations();
    english.unmount();

    startPreferences('ar');
    renderProfile();
    const sheet = await open(user, 'تعديل عن المساحة', 'تعديل: عن المساحة');
    expect(within(sheet).getByRole('textbox', { name: 'الاسم بالإنجليزية' })).toHaveAttribute(
      'lang',
      'en',
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('«الموقع»', () => {
  it('marks a landmark shown in the other language with its language and direction', async () => {
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Location' });

    const landmark = within(sectionOf('Location')).getByText('قرب المفترق');
    expect(landmark).toHaveAttribute('lang', 'ar');
    expect(landmark).toHaveAttribute('dir', 'rtl');
    expect(landmark.parentElement).toHaveTextContent('Landmark: قرب المفترق');
  });
});

describe('«الموقع»’s Sheet', () => {
  it('sends only its own changed fields, never the names or the descriptions (L2)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await open(user, 'Edit Location', 'Edit the location');

    await user.type(
      within(sheet).getByRole('textbox', { name: /Landmark in English/ }),
      'Near the junction',
    );
    await user.selectOptions(within(sheet).getByRole('combobox', { name: 'Area field' }), '12');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ areaId: 12, landmarkEn: 'Near the junction' });
  });

  it('moves the pin to where the owner is, inside the Strip, and says so (L2)', async () => {
    const user = userEvent.setup({ delay: null });
    const geolocation = fakeGeolocation();
    renderProfile();
    const sheet = await open(user, 'Edit Location', 'Edit the location');

    await user.click(within(sheet).getByRole('button', { name: 'Use my current location' }));
    expect(geolocation.asks.at(-1)?.options).toEqual({ enableHighAccuracy: true, timeout: 10_000 });
    act(() => {
      geolocation.succeed(31.5, 34.46, 10);
    });

    expect(within(sheet).getByRole('textbox', { name: 'Coordinates' })).toHaveValue(
      '31.50000, 34.46000',
    );
    expect(
      await findToast('The pin moved to where you are now. Adjust it if needed.'),
    ).toBeInTheDocument();
  });

  it('keeps the pin and says a place outside the Strip is so', async () => {
    const user = userEvent.setup({ delay: null });
    const geolocation = fakeGeolocation();
    renderProfile();
    const sheet = await open(user, 'Edit Location', 'Edit the location');

    await user.click(within(sheet).getByRole('button', { name: 'Use my current location' }));
    act(() => {
      geolocation.succeed(31.3, 34.12, 10);
    });

    const coordinates = within(sheet).getByRole('textbox', { name: 'Coordinates' });
    expect(coordinates).toHaveValue('31.51950, 34.44700');
    expect(within(sheet).getByText('The location is outside the Gaza Strip')).toBeInTheDocument();
  });

  it('says how to go on when the browser cannot tell where the owner is', async () => {
    const user = userEvent.setup({ delay: null });
    const geolocation = fakeGeolocation();
    renderProfile();
    const sheet = await open(user, 'Edit Location', 'Edit the location');

    await user.click(within(sheet).getByRole('button', { name: 'Use my current location' }));
    act(() => {
      geolocation.fail();
    });

    expect(
      within(sheet).getByText(
        'We couldn’t tell where you are. Let the browser know your location, or place the pin on the map.',
      ),
    ).toBeInTheDocument();
  });

  it('draws no «استخدم موقعي الحالي» where the browser has no geolocation', async () => {
    const user = userEvent.setup({ delay: null });
    vi.stubGlobal(
      'navigator',
      Object.assign(Object.create(navigator) as Navigator, { geolocation: undefined }),
    );
    renderProfile();
    const sheet = await open(user, 'Edit Location', 'Edit the location');

    expect(within(sheet).queryByRole('button', { name: 'Use my current location' })).toBeNull();
  });

  it('refuses coordinates outside the Strip on their field, and sends nothing', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await open(user, 'Edit Location', 'Edit the location');
    const coordinates = within(sheet).getByRole('textbox', { name: 'Coordinates' });

    await user.clear(coordinates);
    await user.type(coordinates, '31.3, 34.12');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(
      await within(sheet).findByText('The location is outside the Gaza Strip'),
    ).toBeInTheDocument();
    expect(coordinates).toHaveAttribute('aria-invalid', 'true');
    expect(writes()).toEqual([]);
  });
});
