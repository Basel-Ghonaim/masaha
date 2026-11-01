import type { DomainErrorCode, ErrorType, FieldErrors } from './errors.ts';

// The envelopes every answer comes in (docs/api/api-contract.md §2).

/**
 * A success answer. `meta` is the pagination of a list (§4), or what an endpoint adds, such as the
 * front desk's warnings. A 204 has no body, so no envelope.
 */
export interface SuccessEnvelope<T, M = unknown> {
  success: true;
  data: T;
  meta?: M;
}

/** The `meta` of an answer that succeeded with advice: the front desk's warnings (§6's codes). */
export interface WarningsMeta {
  warnings: DomainErrorCode[];
}

/**
 * The record a refusal names, so the client can act on it without a second search. Today only
 * `ALREADY_OWNER` carries it: the owner's account, to link instead.
 */
export interface ErrorDetails {
  userId: number;
}

/** An error answer. */
export interface ErrorEnvelope {
  success: false;
  error: {
    type: ErrorType;
    code?: DomainErrorCode;
    /** English, for developers and logs only: never shown to users. */
    message: string;
    errors?: FieldErrors;
    /** The record a refusal is about, when it names one (api-contract §2). */
    details?: ErrorDetails;
    /** The X-Request-Id of this answer. */
    requestId: string;
  };
}
