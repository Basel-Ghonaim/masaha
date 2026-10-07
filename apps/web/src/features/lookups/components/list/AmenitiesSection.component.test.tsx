import type { AdminAmenity } from '@masaha/shared/lookups';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AmenitiesSection } from './AmenitiesSection';

const INTERNET: AdminAmenity = {
  id: 4,
  key: 'internet',
  nameAr: 'إنترنت',
  nameEn: 'Internet',
  icon: 'wifi',
  isActive: true,
  isFilterable: false,
};
const HALLS: AdminAmenity = {
  id: 6,
  key: 'halls_for_rent',
  nameAr: 'قاعات للإيجار',
  nameEn: 'Halls for rent',
  icon: 'presentation',
  isActive: false,
  isFilterable: true,
};

/** The section, with the amenities answered by `answer`. */
function renderSection(answer: Parameters<typeof fakeTransport>[0] = () => ok([INTERNET, HALLS])) {
  const requests = fakeTransport(answer);
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <AmenitiesSection />
    </Wrapper>,
  );
  return { ...rendered, requests };
}

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The amenities' rows, once the list has arrived. */
async function rows() {
  const section = await screen.findByRole('region', { name: 'Amenities' });
  return within(await within(section).findByRole('list')).getAllByRole('listitem');
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('AmenitiesSection', () => {
  it('shows each amenity with its icon, its English name first, then its Arabic name and its badges', async () => {
    renderSection();

    const [internet, halls] = await rows();
    expect(screen.getByRole('heading', { name: 'Amenities', level: 2 })).toBeInTheDocument();
    // Each row's icon, names and badges come first; its controls follow.
    expect([internet, halls].map((row) => row?.firstElementChild?.textContent)).toEqual([
      'InternetإنترنتNot in filters',
      'Halls for rentقاعات للإيجارInactive',
    ]);
    expect(internet?.querySelector('svg.lucide-wifi')).toHaveAttribute('aria-hidden', 'true');
    expect(within(internet as HTMLElement).getByText('إنترنت')).toHaveAttribute('lang', 'ar');
    expect(within(internet as HTMLElement).getByText('Internet')).toHaveAttribute('lang', 'en');
  });

  it('shows the Arabic name first in the Arabic interface', async () => {
    startPreferences('ar');
    renderSection();

    const section = await screen.findByRole('region', { name: 'المرافق' });
    const [internet] = within(await within(section).findByRole('list')).getAllByRole('listitem');
    expect(internet?.firstElementChild?.textContent).toBe('إنترنتInternetليس في الفلاتر');
  });

  it('names each switch and arrow after its amenity, with each switch’s words beside it', async () => {
    renderSection();

    const [internet, halls] = (await rows()) as [HTMLElement, HTMLElement];
    const inFilters = within(internet).getByRole('switch', { name: heard('In filters: Internet') });
    expect(inFilters).not.toBeChecked();
    expect(within(internet).getByRole('switch', { name: heard('Active: Internet') })).toBeChecked();
    expect(
      within(halls).getByRole('switch', { name: heard('Active: Halls for rent') }),
    ).not.toBeChecked();
    expect(within(internet).getByText('In filters')).toBeVisible();
    expect(within(internet).getByText('Active')).toBeVisible();
    expect(
      within(internet).getByRole('button', { name: heard('Move up: Internet') }),
    ).toBeDisabled();
    expect(
      within(halls).getByRole('button', { name: heard('Move down: Halls for rent') }),
    ).toBeDisabled();
    expect(
      within(internet).getByRole('button', { name: heard('Edit: Internet') }),
    ).toBeInTheDocument();
  });

  it('turns a switch by its words too', async () => {
    const { requests } = renderSection((request) =>
      request.method === 'get' ? ok([INTERNET, HALLS]) : ok({ ...INTERNET, isFilterable: true }),
    );
    const [internet] = (await rows()) as [HTMLElement];

    await userEvent.click(within(internet).getByText('In filters'));

    await waitFor(() => {
      expect(requests.some(({ method }) => method === 'patch')).toBe(true);
    });
  });

  it('keeps the keyboard on a switch that waits, and ignores it until the server answers', async () => {
    const answered = deferred<FakeAnswer>();
    const { requests } = renderSection((request) =>
      request.method === 'get' ? ok([INTERNET, HALLS]) : answered.promise,
    );
    const [internet] = (await rows()) as [HTMLElement];
    const inFilters = within(internet).getByRole('switch', { name: heard('In filters: Internet') });

    inFilters.focus();
    await userEvent.keyboard(' ');
    await waitFor(() => {
      expect(inFilters).toHaveAttribute('aria-disabled', 'true');
    });
    expect(inFilters).toHaveFocus();
    await userEvent.keyboard(' ');

    expect(requests.filter(({ method }) => method === 'patch')).toHaveLength(1);
    answered.resolve(ok({ ...INTERNET, isFilterable: true }));
    await waitFor(() => {
      expect(inFilters).not.toHaveAttribute('aria-disabled');
    });
  });

  it('shows a row’s failed action in that row, so it names its amenity', async () => {
    renderSection((request) =>
      request.method === 'get' ? ok([INTERNET, HALLS]) : refused(404, { type: 'not_found' }),
    );
    const [internet, halls] = (await rows()) as [HTMLElement, HTMLElement];

    await userEvent.click(
      within(internet).getByRole('switch', { name: heard('Active: Internet') }),
    );

    const alert = await within(internet).findByRole('alert');
    expect(alert).toHaveTextContent('The change wasn’t saved');
    expect(within(halls).queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shows a failed order above the list', async () => {
    renderSection((request) =>
      request.method === 'get' ? ok([INTERNET, HALLS]) : refused(409, { type: 'conflict' }),
    );
    const [internet] = (await rows()) as [HTMLElement];

    await userEvent.click(
      within(internet).getByRole('button', { name: heard('Move down: Internet') }),
    );

    const section = screen.getByRole('region', { name: 'Amenities' });
    const alert = await within(section).findByRole('alert');
    expect(alert).toHaveTextContent('The order changed meanwhile; the new order is shown.');
    expect(alert.compareDocumentPosition(within(section).getByRole('list'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('is busy while the amenities load', () => {
    renderSection(() => deferred<FakeAnswer>().promise);

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true');
  });

  it('says it could not load the amenities, and tries again', async () => {
    let calls = 0;
    renderSection(() => {
      calls += 1;
      return calls === 1 ? refused(403, { type: 'forbidden' }) : ok([INTERNET]);
    });

    expect(
      await screen.findByRole('heading', { name: 'We couldn’t load the amenities' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await rows()).toHaveLength(1);
  });

  it('says when there are no amenities yet', async () => {
    renderSection(() => ok([]));

    expect(await screen.findByRole('heading', { name: 'No amenities yet' })).toBeInTheDocument();
    expect(screen.getByText('Add the first amenity.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderSection();
    await rows();

    expect(await axe(container)).toHaveNoViolations();
  });
});
