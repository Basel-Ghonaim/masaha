import { createQueryClient } from '@shared/api';
import { Toaster } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SpaceEditor } from '../features/spaces/components/editor/SpaceEditor';
import type { AmenitiesField } from '../features/spaces/types/AmenitiesField';
import type { AmenityCatalogue } from '../features/spaces/types/AmenityCatalogue';
import type { AreaField } from '../features/spaces/types/AreaField';
import type { OwnedSpace } from '../features/spaces/types/OwnersSlot';
import type { SectionId } from '../features/spaces/types/SectionId';
import type { FakeAnswer } from './fakeAdapter';
import { fakeTransport, ok } from './fakeTransport';
import { CATALOGUE, PHOTOS, SPACE } from './spaceFixtures';

export { CATALOGUE, NEW_SPACE, NOW, PHOTOS, SPACE } from './spaceFixtures';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

// The page fills the area field from another capability; this plain select stands in for it.
const areaField: AreaField = ({ value, onValueChange, disabled, ref }) => (
  <select
    aria-label="Area field"
    ref={ref as never}
    value={value === null ? '' : String(value)}
    disabled={disabled}
    onChange={(event) => {
      onValueChange(Number(event.target.value));
    }}
  >
    <option value="11">Al-Rimal</option>
    <option value="12">Tal al-Hawa</option>
  </select>
);

// The page fills the amenities' checklist from another capability; this one stands in for it.
const amenitiesField: AmenitiesField = ({ label, value, onValueChange, disabled }) => (
  <fieldset aria-label={label}>
    {CATALOGUE.map(({ id, nameEn }) => (
      <label key={id}>
        <input
          type="checkbox"
          checked={value.includes(id)}
          disabled={disabled}
          onChange={(event) => {
            onValueChange(
              event.target.checked ? [...value, id] : value.filter((other) => other !== id),
            );
          }}
        />
        {nameEn}
      </label>
    ))}
  </fieldset>
);

/**
 * The profile of space 7 at `/spaces/7` (or `entry`), beside another page, `/elsewhere`: the admin's,
 * or the owner's (`owner`), whose packages use the shifts `packageShifts`. The server answers the
 * space's read with `read` (by default the space, verified for its owner, who edits only a verified
 * one), the gallery's with `photos`, and every write with `write`.
 */
export function renderProfile({
  owner = false,
  read = () => ok(owner ? { ...SPACE, isVerified: true } : SPACE),
  photos = () => ok(PHOTOS),
  write = () => ok(SPACE),
  packageShifts = [],
  noticeFor,
  entry = '/spaces/7',
  catalogue = { entries: CATALOGUE, failed: false, retry: () => undefined },
}: {
  read?: () => FakeAnswer | Promise<FakeAnswer>;
  photos?: () => FakeAnswer | Promise<FakeAnswer>;
  write?: (request: Request) => FakeAnswer | Promise<FakeAnswer>;
  owner?: boolean;
  packageShifts?: number[];
  noticeFor?: (section: SectionId) => ReactNode;
  entry?: string;
  catalogue?: AmenityCatalogue;
} = {}) {
  const requests = fakeTransport((request) => {
    if (request.method !== 'get') return write(request);
    return request.url?.endsWith('/photos') === true ? photos() : read();
  });
  // The owners' actions the page would set: here a button, and what the profile gave it.
  const owned: OwnedSpace[] = [];
  const ownerActions = (space: OwnedSpace) => {
    owned.push(space);
    return <button type="button">Owners’ actions</button>;
  };
  const router = createMemoryRouter(
    [
      {
        path: '/spaces/7',
        element: (
          <SpaceEditor
            spaceId={7}
            place={
              owner
                ? { kind: 'owner', closureLink: '/announcements', packageShifts }
                : {
                    kind: 'admin',
                    ownerActions,
                    amenitiesListLink: '/lookups?tab=amenities',
                    reportsLink: (id: number) => `/reports?space=${String(id)}`,
                  }
            }
            areaField={areaField}
            areaLine={(areaId) => `Area ${String(areaId)}, Gaza`}
            amenitiesField={amenitiesField}
            amenityCatalogue={catalogue}
            publicLink={(slug) => `/spaces/${slug}`}
            noticeFor={noticeFor}
          />
        ),
      },
      { path: '/elsewhere', element: <p>Elsewhere</p> },
      { path: '/lookups', element: <p>The lookups</p> },
    ],
    { initialEntries: [entry] },
  );
  const rendered = render(
    <QueryClientProvider client={createQueryClient()}>
      <Toaster label="Notifications" closeLabel="Close notification" />
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const writes = () => requests.filter((request) => request.method !== 'get');
  return { ...rendered, requests, writes, router, owned };
}

/** The section of the profile whose heading is `name`. */
export function sectionOf(name: string): HTMLElement {
  return screen.getByRole('heading', { level: 2, name }).closest('[data-slot=card]') as HTMLElement;
}

/** The open Sheet: the dialog titled `title`. */
export function sheetOf(title: string): HTMLElement {
  return screen.getByRole('dialog', { name: title });
}
