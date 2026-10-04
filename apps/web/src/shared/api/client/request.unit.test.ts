import type { PaginationMeta } from '@masaha/shared/core';
import { AppError } from '@shared/errors';
import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createApi } from './request';
import { installInterceptors } from './setupApiClient';

const META: PaginationMeta = {
  currentPage: 2,
  limit: 20,
  totalPages: 3,
  totalRecords: 41,
  hasNextPage: true,
  hasPreviousPage: true,
};

/** The helpers on a client with the app's interceptors, answering every request with `answer`. */
function setup(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
  const client = axios.create({ adapter: server.adapter, baseURL: '/api/v1' });
  installInterceptors(client, { getAccessToken: () => null });
  return { api: createApi(client), requests: server.requests };
}

describe('the request helpers', () => {
  it('resolve a GET to the envelope’s data', async () => {
    const { api } = setup({ status: 200, data: { success: true, data: { id: 7 } } });

    await expect(api.get<{ id: number }>('/spaces/7')).resolves.toEqual({ id: 7 });
  });

  it('send a POST’s body and resolve to the envelope’s data', async () => {
    const { api, requests } = setup({ status: 201, data: { success: true, data: { id: 8 } } });

    await expect(api.post<{ id: number }>('/spaces', { name: 'Hub' })).resolves.toEqual({ id: 8 });
    expect(JSON.parse(requests[0]?.data as string)).toEqual({ name: 'Hub' });
  });

  it('resolve a 204 to nothing', async () => {
    const { api } = setup({ status: 204 });

    await expect(api.post<undefined>('/auth/logout')).resolves.toBeUndefined();
  });

  it('keep meta beside the data for a page', async () => {
    const { api } = setup({ status: 200, data: { success: true, data: [{ id: 7 }], meta: META } });

    await expect(api.getPage<{ id: number }[]>('/spaces')).resolves.toEqual({
      data: [{ id: 7 }],
      meta: META,
    });
  });

  it('reject a page with no meta as an unknown AppError, with the request id', async () => {
    const { api } = setup({
      status: 200,
      data: { success: true, data: [{ id: 7 }] },
      headers: { 'x-request-id': 'r-2' },
    });

    const failure = api.getPage('/spaces');

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({ type: 'unknown', status: 200, requestId: 'r-2' });
  });

  it('reject an error answer as an AppError with its type and status', async () => {
    const { api } = setup({
      status: 404,
      data: { success: false, error: { type: 'not_found', message: 'No space', requestId: 'r-1' } },
    });

    const failure = api.get('/spaces/9');

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({ type: 'not_found', status: 404 });
  });

  it('reject a request with no answer as a network AppError', async () => {
    const { api } = setup({ failure: 'ERR_NETWORK' });

    const failure = api.post('/spaces', {});

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({ type: 'network', status: 0 });
  });
});
