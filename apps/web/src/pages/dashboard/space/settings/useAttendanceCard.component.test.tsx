import type { SpaceSettings } from '@masaha/shared/space-settings';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import { AttendanceCard } from './AttendanceCard';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const SETTINGS: SpaceSettings = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: 240,
  visitRounding: 'PER_MINUTE',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: null,
};

/**
 * The attendance card of space 7, its capacity 40 and its stay limit 4 hours; each write is answered
 * by `capacityWrite` or `settingsWrite`, as the server would, from what was sent.
 */
function renderCard({
  capacityWrite = (request: Request) => ok(bodyOf(request)),
  settingsWrite = (request: Request) => ok({ ...SETTINGS, ...(bodyOf(request) as object) }),
  settingsRead = () => ok(SETTINGS),
}: {
  capacityWrite?: (request: Request) => FakeAnswer;
  settingsWrite?: (request: Request) => FakeAnswer;
  settingsRead?: () => FakeAnswer;
} = {}) {
  const requests = fakeTransport((request) => {
    const capacity = request.url === '/manage/spaces/7/capacity';
    if (request.method === 'get') return capacity ? ok({ capacity: 40 }) : settingsRead();
    return capacity ? capacityWrite(request) : settingsWrite(request);
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Toaster label="Notifications" closeLabel="Close notification" />
      <AttendanceCard spaceId={7} />
    </QueryClientProvider>,
  );
  const writes = () =>
    requests
      .filter(({ method }) => method !== 'get')
      .map(
        (request) =>
          `${String(request.method)} ${String(request.url)} ${JSON.stringify(bodyOf(request))}`,
      );
  return { writes, user: userEvent.setup() };
}

async function typeInto(user: ReturnType<typeof userEvent.setup>, label: RegExp, value: string) {
  const field = await screen.findByRole('textbox', { name: label });
  await user.clear(field);
  if (value !== '') await user.type(field, value);
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Save' }));

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('the attendance card', () => {
  it('saves the capacity, then the settings, in one save, and says so once', async () => {
    const { writes, user } = renderCard();

    await typeInto(user, /^Capacity/, '35');
    await typeInto(user, /^Automatic check-out after/, '5');
    await save(user);

    await waitFor(() => {
      expect(writes()).toEqual([
        'put /manage/spaces/7/capacity {"capacity":35}',
        'patch /manage/spaces/7/settings {"maxStayMinutes":300}',
      ]);
    });
    expect(await findToast('“Attendance and the live status” saved')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('says the capacity was saved and the rest not when the settings fail after it, keeps every value, and sends only the settings next', async () => {
    let refuse = true;
    const { writes, user } = renderCard({
      settingsWrite: (request) =>
        refuse
          ? refused(500, { type: 'internal' })
          : ok({ ...SETTINGS, ...(bodyOf(request) as object) }),
    });
    await typeInto(user, /^Capacity/, '35');
    await typeInto(user, /^Automatic check-out after/, '5');

    await save(user);

    expect(
      await screen.findByText('The capacity was saved; the automatic check-out settings were not'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Capacity/ })).toHaveValue('35');
    expect(screen.getByRole('textbox', { name: /^Automatic check-out after/ })).toHaveValue('5');

    refuse = false;
    await save(user);
    await waitFor(() => {
      expect(writes()).toEqual([
        'put /manage/spaces/7/capacity {"capacity":35}',
        'patch /manage/spaces/7/settings {"maxStayMinutes":300}',
        'patch /manage/spaces/7/settings {"maxStayMinutes":300}',
      ]);
    });
  });

  it('still says the capacity was saved when the settings fail after it with no answer at all', async () => {
    const { writes, user } = renderCard({ settingsWrite: () => ({ failure: 'ERR_NETWORK' }) });
    await typeInto(user, /^Capacity/, '35');
    await typeInto(user, /^Automatic check-out after/, '5');

    await save(user);

    await waitFor(() => {
      expect(writes()).toHaveLength(2);
    });
    expect(
      await screen.findByText('The capacity was saved; the automatic check-out settings were not'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Capacity/ })).toHaveValue('35');
  });

  it('never says nothing was saved when the settings are refused 403 after the capacity', async () => {
    const { user } = renderCard({ settingsWrite: () => refused(403, { type: 'forbidden' }) });
    await typeInto(user, /^Capacity/, '35');
    await typeInto(user, /^Automatic check-out after/, '5');

    await save(user);

    expect(
      await screen.findByText('The capacity was saved; the automatic check-out settings were not'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('This is no longer open to you at this space.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/nothing was saved/)).toBeNull();
  });

  it('sends an empty capacity as none, and an empty stay limit as none', async () => {
    const { writes, user } = renderCard();

    await typeInto(user, /^Capacity/, '');
    await typeInto(user, /^Automatic check-out after/, '');
    await save(user);

    await waitFor(() => {
      expect(writes()).toEqual([
        'put /manage/spaces/7/capacity {"capacity":null}',
        'patch /manage/spaces/7/settings {"maxStayMinutes":null}',
      ]);
    });
  });

  it('leaves settings that cannot be read to the cards below, drawing no alert of its own', async () => {
    renderCard({ settingsRead: () => refused(404, { type: 'not_found' }) });

    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });
    expect(screen.queryByText('We couldn’t load the settings')).toBeNull();
  });

  it('says it is loading to a screen reader while its values arrive', () => {
    renderCard();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('sends nothing for a save that changed nothing, and says so', async () => {
    const { writes, user } = renderCard();
    await screen.findByRole('textbox', { name: /^Capacity/ });

    await save(user);

    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });
});
