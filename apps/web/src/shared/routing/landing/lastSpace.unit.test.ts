import { afterEach, describe, expect, it, vi } from 'vitest';
import { blockLocalStorage, stubLocalStorage } from '../../../test/fakeStorage';
import { aSession } from '../../../test/fakeSession';
import { lastSpace, rememberSpace } from './lastSpace';

const sara = aSession({
  id: 1,
  spaces: [
    { spaceId: 3, role: 'OWNER' },
    { spaceId: 7, role: 'RECEPTION' },
  ],
}).user;
const omar = aSession({ id: 2, spaces: [{ spaceId: 3, role: 'RECEPTION' }] }).user;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the last space', () => {
  it('is remembered under a key that names the user', () => {
    const items = stubLocalStorage();

    rememberSpace(1, 7);

    expect([...items]).toEqual([['masaha.lastSpace.1', '7']]);
  });

  it('reads back as the user’s active link at that space', () => {
    stubLocalStorage();
    rememberSpace(1, 7);

    expect(lastSpace(sara)).toEqual({ spaceId: 7, role: 'RECEPTION' });
  });

  it('is kept per user, so one user’s space is never another’s', () => {
    stubLocalStorage();
    rememberSpace(1, 3);

    expect(lastSpace(omar)).toBeUndefined();
    rememberSpace(2, 3);
    expect(lastSpace(omar)).toEqual({ spaceId: 3, role: 'RECEPTION' });
    expect(lastSpace(sara)).toEqual({ spaceId: 3, role: 'OWNER' });
  });

  it('reads back as nothing when the user no longer holds an active link there', () => {
    stubLocalStorage();
    rememberSpace(1, 9);

    expect(lastSpace(sara)).toBeUndefined();
  });

  it('reads back as nothing when none is remembered', () => {
    stubLocalStorage();

    expect(lastSpace(sara)).toBeUndefined();
  });

  it.each(['abc', '07', ' 7', '7.0', ''])(
    'reads back the stored value %j as nothing, not as a space',
    (stored) => {
      stubLocalStorage().set('masaha.lastSpace.1', stored);

      expect(lastSpace(sara)).toBeUndefined();
    },
  );

  it('is harmless when storage throws: remembering does nothing, and reading finds nothing', () => {
    blockLocalStorage();

    expect(() => {
      rememberSpace(1, 7);
    }).not.toThrow();
    expect(lastSpace(sara)).toBeUndefined();
  });
});
