import type { PaginationMeta, SuccessEnvelope } from '@masaha/shared/core';
import { AppError } from '@shared/errors';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './client';

/** A page of a list, with what the envelope's `meta` carries: the pagination, or an endpoint's own. */
export type Page<T, M = PaginationMeta> = { data: T; meta: M };

/** The payload of an answer; a 204 has no body, and resolves with nothing. */
function payload<T>(response: AxiosResponse<SuccessEnvelope<T>>): T {
  return response.status === 204 ? (undefined as T) : response.data.data;
}

/**
 * Calls that resolve to the envelope's `data`, so no capability writes `unwrap` or sees the envelope
 * (docs/frontend/architecture.md §7). A failure rejects with the client's AppError.
 */
export function createApi(client: AxiosInstance) {
  return {
    get: <T>(url: string, config?: AxiosRequestConfig) =>
      client.get<SuccessEnvelope<T>>(url, config).then(payload<T>),
    post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
      client.post<SuccessEnvelope<T>>(url, body, config).then(payload<T>),
    put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
      client.put<SuccessEnvelope<T>>(url, body, config).then(payload<T>),
    patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
      client.patch<SuccessEnvelope<T>>(url, body, config).then(payload<T>),
    delete: <T>(url: string, config?: AxiosRequestConfig) =>
      client.delete<SuccessEnvelope<T>>(url, config).then(payload<T>),
    /**
     * A list with its `meta`: the pagination, or what the endpoint adds, such as warnings. An answer
     * without `meta` breaks the contract of the endpoints this is for, so it rejects as `unknown`
     * rather than handing a screen a page it cannot paginate.
     */
    getPage: async <T, M = PaginationMeta>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<Page<T, M>> => {
      const response = await client.get<SuccessEnvelope<T, M>>(url, config);
      const { data, meta } = response.data;
      if (meta === undefined) {
        throw new AppError({
          type: 'unknown',
          status: response.status,
          requestId: response.headers['x-request-id'] as string | undefined,
          message: `The answer to ${url} has no meta.`,
        });
      }
      return { data, meta };
    },
  };
}

export type Api = ReturnType<typeof createApi>;

/** The calls, on the app's one client. */
export const api: Api = createApi(apiClient);
