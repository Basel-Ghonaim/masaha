import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adminReport, myReport, spaceReport } from '../../../test/dataReport';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createDataReportsRepository } from './dataReportsRepository';

const META = {
  currentPage: 2,
  limit: 20,
  totalRecords: 21,
  totalPages: 2,
  hasNextPage: false,
  hasPreviousPage: true,
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: () => FakeAnswer) {
  const server = fakeAdapter(() => answer());
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const lineOf = ({ method, url }: { method?: string; url?: string }) =>
  `${String(method)} ${String(url)}`;

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the data reports repository', () => {
  it('reads a page of the space’s reports, the query as its parameters', async () => {
    const requests = serve(() => ({
      status: 200,
      data: { success: true, data: [spaceReport()], meta: META },
    }));
    const query = { status: 'OPEN' as const, page: 2, limit: 20 };

    await expect(createDataReportsRepository().spaceReports(7, query)).resolves.toEqual({
      data: [spaceReport()],
      meta: META,
    });
    expect(requests.map(lineOf)).toEqual(['get /manage/spaces/7/data-reports']);
    expect(requests[0]?.params).toEqual(query);
  });

  it('sends the owner’s decision to the report’s own path, its body as given', async () => {
    const decided = spaceReport({ status: 'DISMISSED' });
    const requests = serve(() => ({ status: 200, data: { success: true, data: decided } }));

    await expect(
      createDataReportsRepository().decideSpace(7, 41, { status: 'DISMISSED', note: 'Correct' }),
    ).resolves.toEqual(decided);
    expect(requests.map(lineOf)).toEqual(['patch /manage/spaces/7/data-reports/41']);
    expect(JSON.parse(String(requests[0]?.data))).toEqual({ status: 'DISMISSED', note: 'Correct' });
  });

  it('reads a page of every space’s reports, the admin’s query as its parameters', async () => {
    const requests = serve(() => ({
      status: 200,
      data: { success: true, data: [adminReport()], meta: META },
    }));
    const query = {
      status: 'DECIDED' as const,
      field: 'HOURS' as const,
      spaceId: 7,
      page: 2,
      limit: 20,
    };

    await expect(createDataReportsRepository().adminReports(query)).resolves.toEqual({
      data: [adminReport()],
      meta: META,
    });
    expect(requests.map(lineOf)).toEqual(['get /admin/data-reports']);
    expect(requests[0]?.params).toEqual(query);
  });

  it('sends the admin’s decision to the report’s own path, its body as given', async () => {
    const decided = adminReport({ status: 'RESOLVED' });
    const requests = serve(() => ({ status: 200, data: { success: true, data: decided } }));

    await expect(
      createDataReportsRepository().decideAdmin(41, { status: 'RESOLVED' }),
    ).resolves.toEqual(decided);
    expect(requests.map(lineOf)).toEqual(['patch /admin/data-reports/41']);
    expect(JSON.parse(String(requests[0]?.data))).toEqual({ status: 'RESOLVED' });
  });

  it('reads a page of the user’s own reports, the query as its parameters', async () => {
    const requests = serve(() => ({
      status: 200,
      data: { success: true, data: [myReport()], meta: META },
    }));
    const query = { status: 'DECIDED' as const, page: 2, limit: 20 };

    await expect(createDataReportsRepository().myReports(query)).resolves.toEqual({
      data: [myReport()],
      meta: META,
    });
    expect(requests.map(lineOf)).toEqual(['get /me/reports']);
    expect(requests[0]?.params).toEqual(query);
  });

  it('rejects with the AppError the transport made', async () => {
    serve(() => ({
      status: 409,
      data: {
        success: false,
        error: { type: 'conflict', code: 'REPORT_ALREADY_DECIDED', message: 'No', requestId: 'r' },
      },
    }));

    await expect(
      createDataReportsRepository().decideSpace(7, 41, { status: 'RESOLVED' }),
    ).rejects.toMatchObject({ status: 409, code: 'REPORT_ALREADY_DECIDED' });
  });
});
