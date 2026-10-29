import type {
  Announcement,
  AnnouncementsQuery,
  AnnouncementsSummary,
  ClosureExtension,
  CreateAnnouncementRequest,
  EditAnnouncementRequest,
  ExtendSubscriptionsRequest,
  ExtensionPreview,
  ManagedAnnouncement,
} from '@masaha/shared/announcements';
import { api, withIdempotencyKey, type Page } from '@shared/api';

/**
 * A space's announcements on the server (docs/api/api-contract.md §5, Announcements (managed)): the
 * managed list and its summary, which `subscriptions` composes on the same path (S2).
 */
export interface AnnouncementsRepository {
  /** A page of one state's announcements, a closure with its extension. */
  list(spaceId: number, query: AnnouncementsQuery): Promise<Page<ManagedAnnouncement[]>>;
  /** How many are running, upcoming and ended: the tabs' counts. */
  summary(spaceId: number): Promise<AnnouncementsSummary>;
  /** Posts an announcement, with its intent's key: a retry answers the first (S4). */
  create(spaceId: number, body: CreateAnnouncementRequest, key: string): Promise<Announcement>;
  /** Edits what the body sets; idempotent by design, so it carries no key. */
  edit(spaceId: number, id: number, body: EditAnnouncementRequest): Promise<Announcement>;
  /** Ends a running one now; one ended already is answered as it is. */
  end(spaceId: number, id: number): Promise<Announcement>;
  /** Starts an upcoming one now; one started already is answered as it is. */
  start(spaceId: number, id: number): Promise<Announcement>;
  /** Deletes one, in any state; one deleted already answers the same. */
  remove(spaceId: number, id: number): Promise<undefined>;
  /** A started closure's extension before it is applied, or as applied: `subscriptions`' (S2). */
  preview(spaceId: number, id: number): Promise<ExtensionPreview>;
  /** Extends the subscriptions a closure covered, the owner's, with its intent's key (S4). */
  extend(
    spaceId: number,
    id: number,
    body: ExtendSubscriptionsRequest,
    key: string,
  ): Promise<ClosureExtension>;
}

const pathOf = (spaceId: number) => `/manage/spaces/${String(spaceId)}/announcements`;

export function createAnnouncementsRepository(): AnnouncementsRepository {
  return {
    list: (spaceId, query) =>
      api.getPage<ManagedAnnouncement[]>(pathOf(spaceId), { params: query }),
    summary: (spaceId) => api.get<AnnouncementsSummary>(`${pathOf(spaceId)}/summary`),
    create: (spaceId, body, key) =>
      api.post<Announcement>(pathOf(spaceId), body, withIdempotencyKey(key)),
    edit: (spaceId, id, body) => api.patch<Announcement>(`${pathOf(spaceId)}/${String(id)}`, body),
    end: (spaceId, id) => api.post<Announcement>(`${pathOf(spaceId)}/${String(id)}/end`),
    start: (spaceId, id) => api.post<Announcement>(`${pathOf(spaceId)}/${String(id)}/start`),
    remove: (spaceId, id) => api.delete<undefined>(`${pathOf(spaceId)}/${String(id)}`),
    preview: (spaceId, id) =>
      api.get<ExtensionPreview>(`${pathOf(spaceId)}/${String(id)}/extend-subscriptions`),
    extend: (spaceId, id, body, key) =>
      api.post<ClosureExtension>(
        `${pathOf(spaceId)}/${String(id)}/extend-subscriptions`,
        body,
        withIdempotencyKey(key),
      ),
  };
}
