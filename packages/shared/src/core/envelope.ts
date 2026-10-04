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

/** An error answer. */
export interface ErrorEnvelope {
  success: false;
  error: {
    type: ErrorType;
    code?: DomainErrorCode;
    /** English, for developers and logs only: never shown to users. */
    message: string;
    errors?: FieldErrors;
    /** The X-Request-Id of this answer. */
    requestId: string;
  };
}
