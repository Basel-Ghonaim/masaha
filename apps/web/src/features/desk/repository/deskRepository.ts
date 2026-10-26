import type {
  CheckInCheckOut,
  CheckOutVisitRequest,
  CustomerFile,
  CustomerRow,
  CustomersQuery,
  DeskWarning,
  LeaveToCustomerRequest,
  NewSubscription,
  ReceivedPayment,
  ReceivePaymentRequest,
  SubscribeRequest,
  SubscriptionStatement,
  VisitCheckOut,
} from '@masaha/shared/desk';
import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '@masaha/shared/customers';
import type { UncollectedVisit } from '@masaha/shared/payments';
import type {
  CheckInSubscriberRequest,
  DeskCheckIn,
  SubscriptionState,
} from '@masaha/shared/subscriptions';
import type {
  CheckInVisitRequest,
  DeskVisit,
  PriceVisitRequest,
  QuotedVisit,
  VisitTerms,
  WriteOffVisitRequest,
} from '@masaha/shared/visits';
import { api, withIdempotencyKey, type Page, type WithMeta } from '@shared/api';

/** A check-in's answer: the visit, with the warnings the server said, when it said some. */
export type CheckedIn = WithMeta<DeskVisit, { warnings: DeskWarning[] }>;
/** A subscriber's check-in's answer: the check-in, with the warnings the server said, if any. */
export type SubscriberCheckedIn = WithMeta<DeskCheckIn, { warnings: DeskWarning[] }>;
/** A subscribe's answer: the subscription and its payments, with the debt warning, if said. */
export type Subscribed = WithMeta<NewSubscription, { warnings: 'CUSTOMER_HAS_DEBT'[] }>;

/**
 * The front desk's visits on the server (docs/api/api-contract.md §5, Front desk (managed)): the
 * terms, a visitor's check-in, a visit's quote and its check-out; the uncollected visits, a payment
 * on one, «تسجيل دين», and the owner's write-off and its undo; the unpriced visits and their price;
 * the customers' search; a subscriber's check-in and check-out, and the open check-ins; a customer's
 * file, their creation, edit, the owner's archive and restore; a subscribe with its payment; a
 * subscription's statement, and its end. The
 * creates carry the intent's key (ADR 0015), which lets the transport send them again; the other
 * writes are idempotent by design and carry none, so they are sent once (S3).
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
  /** A page of the visits closed with something left to collect, the latest closed first. */
  uncollected(spaceId: number, page: number): Promise<Page<UncollectedVisit[]>>;
  /** Records a payment on one item; a retry with the same key answers the first payment. */
  receivePayment(
    spaceId: number,
    body: ReceivePaymentRequest,
    key: string,
  ): Promise<ReceivedPayment>;
  /** «تسجيل دين»: leaves a closed visit's unpaid rest to the customer with this phone. */
  leaveToCustomer(
    spaceId: number,
    visitId: number,
    body: LeaveToCustomerRequest,
  ): Promise<DeskVisit>;
  /** The owner's write-off of what a closed visit still owes, with its reason. */
  writeOff(spaceId: number, visitId: number, body: WriteOffVisitRequest): Promise<DeskVisit>;
  /** Undoes the write-off: the visit is uncollected again. */
  undoWriteOff(spaceId: number, visitId: number): Promise<DeskVisit>;
  /** A page of the visits closed with no charge, the latest closed first. */
  unpriced(spaceId: number, page: number): Promise<Page<DeskVisit[]>>;
  /** Types an unpriced visit's charge, with its reason. */
  price(spaceId: number, visitId: number, body: PriceVisitRequest): Promise<DeskVisit>;
  /** A page of the space's customers the query finds, by name. */
  customers(spaceId: number, query: CustomersQuery): Promise<Page<CustomerRow[]>>;
  /** Checks a subscriber in on a subscription; a retry with the same key answers the same check-in. */
  checkInSubscriber(
    spaceId: number,
    body: CheckInSubscriberRequest,
    key: string,
  ): Promise<SubscriberCheckedIn>;
  /** Checks a subscriber out, with what their subscription was paid and still owes. */
  checkOutSubscriber(spaceId: number, checkInId: number): Promise<CheckInCheckOut>;
  /** Every open subscriber check-in, the earliest first, with its customer and subscription. */
  openCheckIns(spaceId: number): Promise<DeskCheckIn[]>;
  /** A customer's file: their money, presence, subscriptions and unpaid visits. */
  file(spaceId: number, customerId: number): Promise<CustomerFile>;
  /** Adds a customer to the space; a retry with the same key answers the same customer. */
  createCustomer(spaceId: number, body: CreateCustomerRequest, key: string): Promise<Customer>;
  /**
   * Subscribes a customer, the payment allocated over their debts by the server; a retry with the
   * same key answers the first subscription.
   */
  subscribe(
    spaceId: number,
    customerId: number,
    body: SubscribeRequest,
    key: string,
  ): Promise<Subscribed>;
  /** Edits a customer's name or phone: only the fields sent change, `null` clearing the phone. */
  editCustomer(spaceId: number, customerId: number, body: UpdateCustomerRequest): Promise<Customer>;
  /** The owner's archive of a customer; one archived already is answered as it is. */
  archiveCustomer(spaceId: number, customerId: number): Promise<Customer>;
  /** The owner's restore of an archived customer; one not archived is answered as it is. */
  restoreCustomer(spaceId: number, customerId: number): Promise<Customer>;
  /** A subscription's statement: its state and money, its check-ins and payments, its renewal. */
  statement(spaceId: number, subscriptionId: number): Promise<SubscriptionStatement>;
  /** Ends a subscription today (its start, if not started); one ended already is answered as it is. */
  endSubscription(spaceId: number, subscriptionId: number): Promise<SubscriptionState>;
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
    uncollected: (spaceId, page) =>
      api.getPage<UncollectedVisit[]>(`${space(spaceId)}/uncollected-visits`, {
        params: { page },
      }),
    receivePayment: (spaceId, body, key) =>
      api.post<ReceivedPayment>(`${space(spaceId)}/payments`, body, withIdempotencyKey(key)),
    leaveToCustomer: (spaceId, visitId, body) =>
      api.put<DeskVisit>(`${visit(spaceId, visitId)}/customer`, body),
    writeOff: (spaceId, visitId, body) =>
      api.post<DeskVisit>(`${visit(spaceId, visitId)}/write-off`, body),
    undoWriteOff: (spaceId, visitId) =>
      api.delete<DeskVisit>(`${visit(spaceId, visitId)}/write-off`),
    unpriced: (spaceId, page) =>
      api.getPage<DeskVisit[]>(`${space(spaceId)}/unpriced-visits`, { params: { page } }),
    price: (spaceId, visitId, body) =>
      api.put<DeskVisit>(`${visit(spaceId, visitId)}/charge`, body),
    customers: (spaceId, query) =>
      api.getPage<CustomerRow[]>(`${space(spaceId)}/customers`, { params: query }),
    checkInSubscriber: (spaceId, body, key) =>
      api.postWithMeta<DeskCheckIn, { warnings: DeskWarning[] }>(
        `${space(spaceId)}/check-ins`,
        body,
        withIdempotencyKey(key),
      ),
    checkOutSubscriber: (spaceId, checkInId) =>
      api.post<CheckInCheckOut>(`${space(spaceId)}/check-ins/${String(checkInId)}/check-out`),
    openCheckIns: (spaceId) =>
      api.get<DeskCheckIn[]>(`${space(spaceId)}/check-ins`, { params: { open: true } }),
    file: (spaceId, customerId) =>
      api.get<CustomerFile>(`${space(spaceId)}/customers/${String(customerId)}`),
    createCustomer: (spaceId, body, key) =>
      api.post<Customer>(`${space(spaceId)}/customers`, body, withIdempotencyKey(key)),
    subscribe: (spaceId, customerId, body, key) =>
      api.postWithMeta<NewSubscription, { warnings: 'CUSTOMER_HAS_DEBT'[] }>(
        `${space(spaceId)}/customers/${String(customerId)}/subscriptions`,
        body,
        withIdempotencyKey(key),
      ),
    editCustomer: (spaceId, customerId, body) =>
      api.patch<Customer>(`${space(spaceId)}/customers/${String(customerId)}`, body),
    archiveCustomer: (spaceId, customerId) =>
      api.post<Customer>(`${space(spaceId)}/customers/${String(customerId)}/archive`),
    restoreCustomer: (spaceId, customerId) =>
      api.post<Customer>(`${space(spaceId)}/customers/${String(customerId)}/restore`),
    statement: (spaceId, subscriptionId) =>
      api.get<SubscriptionStatement>(`${space(spaceId)}/subscriptions/${String(subscriptionId)}`),
    endSubscription: (spaceId, subscriptionId) =>
      api.post<SubscriptionState>(`${space(spaceId)}/subscriptions/${String(subscriptionId)}/end`),
  };
}
