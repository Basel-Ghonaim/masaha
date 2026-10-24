import type { CheckOutVisitRequest, DeskWarning, VisitCheckOut } from '@masaha/shared/desk';
import type {
  CheckInVisitRequest,
  DeskVisit,
  QuotedVisit,
  VisitTerms,
} from '@masaha/shared/visits';
import { api, withIdempotencyKey, type WithMeta } from '@shared/api';

/** A check-in's answer: the visit, with the warnings the server said, when it said some. */
export type CheckedIn = WithMeta<DeskVisit, { warnings: DeskWarning[] }>;

/**
 * The front desk's visits on the server (docs/api/api-contract.md §5, Front desk (managed)): the
 * terms, a visitor's check-in, a visit's quote and its check-out. The writes carry the intent's key
 * (ADR 0015), which lets the transport send them again.
 */
export interface DeskRepository {
  /** The rounding, the cap and the rates a visit would copy now, and whether the caller may type a price. */
  terms(spaceId: number): Promise<VisitTerms>;
  /** Checks a visitor in by name; a retry with the same key answers the same visit. */
  checkInVisit(spaceId: number, body: CheckInVisitRequest, key: string): Promise<CheckedIn>;
  /** A visit, with what it costs now while it is open. */
  quote(spaceId: number, visitId: number): Promise<QuotedVisit>;
  /** Checks a visit out with its payment, if any; a retry with the same key answers the first result. */
  checkOutVisit(
    spaceId: number,
    visitId: number,
    body: CheckOutVisitRequest,
    key: string,
  ): Promise<VisitCheckOut>;
}

export function createDeskRepository(): DeskRepository {
  const space = (spaceId: number) => `/manage/spaces/${String(spaceId)}`;
  const visit = (spaceId: number, visitId: number) => `${space(spaceId)}/visits/${String(visitId)}`;
  return {
    terms: (spaceId) => api.get<VisitTerms>(`${space(spaceId)}/visit-terms`),
    checkInVisit: (spaceId, body, key) =>
      api.postWithMeta<DeskVisit, { warnings: DeskWarning[] }>(
        `${space(spaceId)}/visits`,
        body,
        withIdempotencyKey(key),
      ),
    quote: (spaceId, visitId) => api.get<QuotedVisit>(visit(spaceId, visitId)),
    checkOutVisit: (spaceId, visitId, body, key) =>
      api.post<VisitCheckOut>(
        `${visit(spaceId, visitId)}/check-out`,
        body,
        withIdempotencyKey(key),
      ),
  };
}
