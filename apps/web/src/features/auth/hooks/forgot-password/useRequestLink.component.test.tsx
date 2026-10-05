import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { sentPosition } from '../../../../test/fakeRecovery';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';
import { useRequestLink } from './useRequestLink';

afterEach(() => {
  restoreTransport();
});

describe('useRequestLink', () => {
  it('holds the position the server answered as where the recovery stands, without reading it again', async () => {
    const requests = fakeTransport((config) =>
      config.method === 'get' ? ok({ step: 'request' }) : ok(sentPosition(), 202),
    );
    const { result } = renderHook(
      () => ({ request: useRequestLink(), position: useRecoveryPositionQuery() }),
      { wrapper: queryWrapper() },
    );
    await waitFor(() => {
      expect(result.current.position.data).toEqual({ step: 'request' });
    });

    await act(() => result.current.request.mutateAsync({ email: 'sara@example.com' }));

    await waitFor(() => {
      expect(result.current.position.data).toEqual(sentPosition());
    });
    expect(requests.map((request) => request.method)).toEqual(['get', 'post']);
  });
});
