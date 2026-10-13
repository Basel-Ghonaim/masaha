import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useContactsSection } from './useContactsSection';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

// The isolates around a value inserted into a line: left to right.
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);
const isolated = (value: string) => `${LRI}${value}${PDI}`;

/** A space whose contacts were saved: one phone. */
const SPACE = {
  id: 7,
  contacts: [{ type: 'PHONE', value: '+970599123456' }],
  isVerified: false,
  updatedAt: { contacts: '2026-10-10T08:00:00Z' },
  staleGroups: [],
} as unknown as AdminSpace;

/** A space whose contacts were never saved. */
const MISSING = { ...SPACE, contacts: [], updatedAt: { contacts: null } } as unknown as AdminSpace;

/** The contacts' section of `space`, the server answering every write with `write`. */
function renderSection(
  space: AdminSpace,
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(space),
) {
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : write(request)));
  const client = createQueryClient();
  const onDirtyChange = vi.fn<(group: FactGroup, dirty: boolean) => void>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ current }) => useContactsSection({ space: current, onDirtyChange }),
    { wrapper, initialProps: { current: space } },
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, writes };
}

type Rendered = ReturnType<typeof renderSection>['result'];

/** Adds a contact, of `type` when given, holding `value`. */
async function addContact(result: Rendered, value: string, type?: string) {
  act(() => {
    result.current.add.run();
  });
  const index = result.current.rows.length - 1;
  if (type !== undefined) {
    act(() => {
      result.current.rows[index]?.type.choose(type);
    });
  }
  await typeValue(result, index, value);
}

async function typeValue(result: Rendered, index: number, value: string) {
  const row = result.current.rows[index];
  if (row === undefined) throw new Error('no row');
  await act(async () => {
    await row.value.binding.onChange({
      target: { name: `contacts.${String(index)}.value`, value },
    });
  });
}

function save(result: Rendered) {
  act(() => {
    result.current.frame.save.submit();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useContactsSection', () => {
  it('shows an example of a new contact’s type, a WhatsApp number, while it holds none', () => {
    const { result } = renderSection(MISSING);

    act(() => {
      result.current.add.run();
    });

    expect(result.current.rows[0]?.type.value).toBe('WHATSAPP');
    expect(result.current.rows[0]?.value.helper).toBe(`For example: ${isolated('0599 123 456')}`);
  });

  it('shows the form a value is stored in as it is typed, and a phone’s carrier', async () => {
    const { result } = renderSection(MISSING);

    await addContact(result, '0599 123 456', 'PHONE');

    expect(result.current.rows[0]?.value.helper).toBe(`Stored as ${isolated('+970599123456')}`);
    expect(result.current.rows[0]?.value.carrier).toBe('Jawwal');
  });

  it('sends the contacts in their stored form', async () => {
    const { result, writes } = renderSection(MISSING);
    await addContact(result, '0599 123 456');

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      contacts: [{ type: 'WHATSAPP', value: '+970599123456' }],
    });
  });

  it('refuses each value on its row, in its type’s words, sending nothing', async () => {
    const { result, writes } = renderSection(MISSING);
    await addContact(result, '12');
    await addContact(result, 'name@', 'EMAIL');
    await addContact(result, 'not a link', 'WEBSITE');
    await addContact(result, '');

    save(result);

    await waitFor(() => {
      expect(result.current.rows.map((row) => row.value.error)).toEqual([
        'Not a valid number: a Palestinian or Israeli one',
        'Not a valid email',
        'Not a valid link or name for this type',
        'Fill in the value, or remove this contact',
      ]);
    });
    expect(writes()).toHaveLength(0);
  });

  it('refuses a contact that repeats another once both are stored, on the later row', async () => {
    const { result, writes } = renderSection(MISSING);
    await addContact(result, '0599123456');
    await addContact(result, '+970 599 123 456');

    save(result);

    await waitFor(() => {
      expect(result.current.rows.map((row) => row.value.error)).toEqual([
        undefined,
        'A repeated contact',
      ]);
    });
    expect(writes()).toHaveLength(0);
  });

  it('checks a value again for the type chosen once the section was sent', async () => {
    const { result } = renderSection(MISSING);
    await addContact(result, 'name@example.com');
    save(result);
    await waitFor(() => {
      expect(result.current.rows[0]?.value.error).toBe(
        'Not a valid number: a Palestinian or Israeli one',
      );
    });

    act(() => {
      result.current.rows[0]?.type.choose('EMAIL');
    });

    await waitFor(() => {
      expect(result.current.rows[0]?.value.error).toBeUndefined();
    });
  });

  it('sends nothing for saved contacts as they are, and says how to renew their date', async () => {
    const { result, writes } = renderSection(SPACE);

    save(result);

    await waitFor(() => {
      expect(result.current.frame.note).toBe(
        'Nothing changed. To renew its date, choose “Still correct”.',
      );
    });
    expect(writes()).toHaveLength(0);
  });

  it('stops adding contacts at twenty, saying why', () => {
    const { result } = renderSection({
      ...SPACE,
      contacts: Array.from({ length: 20 }, (_, index) => ({
        type: 'EMAIL' as const,
        value: `desk${String(index)}@example.com`,
      })),
    });

    expect(result.current.add).toMatchObject({ disabled: true, reason: 'Up to 20 contacts' });
  });

  it('keeps its unsaved changes when the space arrives again with its contacts changed elsewhere', async () => {
    const { result, rerender } = renderSection(SPACE);
    await addContact(result, 'name@example.com', 'EMAIL');

    rerender({ current: { ...SPACE, contacts: [] } });

    expect(result.current.frame.unsaved).toBe('Unsaved changes');
    expect(result.current.rows).toHaveLength(2);
  });

  it('holds each row’s Remove while a save is pending', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSection(MISSING, () => answer.promise);
    await addContact(result, '0599 123 456');

    save(result);

    await waitFor(() => {
      expect(result.current.frame.save.pending).toBe(true);
    });
    expect(result.current.rows[0]?.remove.disabled).toBe(true);
    await act(async () => {
      answer.resolve(ok(MISSING));
      await answer.promise;
    });
  });
});
