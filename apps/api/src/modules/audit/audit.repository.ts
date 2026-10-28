import { prisma } from '../../db/index.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import { platformEventsSql } from './platformEvents.ts';

/** An entry with its actor and its target's current name, as the reader selects it. */
export interface AuditRow {
  id: number;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** `null` for the system. */
  actorId: number | null;
  /** Whether the actor has a link of any state to the entry's space: a person; else the platform. */
  linked: boolean;
  /** The actor's name, selected only when linked. */
  actorName: string | null;
  targetName: string | null;
  targetNameAr: string | null;
  targetDeleted: boolean;
}

/** An entry of the admin's log, with the space it names; `null` for none. */
export type PlatformAuditRow = AuditRow & {
  space: { id: number; nameEn: string; nameAr: string | null; deleted: boolean } | null;
};

/** An actor of `meta.actors`: a linked person, the platform or the system. */
export type ActorRow =
  | { kind: 'PERSON'; id: number; name: string }
  | { kind: 'MASAHA'; id: null; name: null }
  | { kind: 'SYSTEM'; id: null; name: null };

/** What the owner's log filters by, each applied before the page is cut. */
export interface SpaceLogFilter {
  /** From when; `null` for all time. */
  since: Date | null;
  q?: string;
  actions?: readonly string[];
  actor?: number | 'MASAHA' | 'SYSTEM';
}

/** What the admin's log filters by: the actor is a person's id. */
export interface PlatformLogFilter {
  since: Date | null;
  q?: string;
  actions?: readonly string[];
  actor?: number;
}

/** The most actors `meta.actors` lists. */
const ACTORS_MAX = 50;

/**
 * The entry's actor, as the owner sees it (S1): its link of any state to the space, kept for ever, is
 * what makes it a person; an actor with none is the platform, never named.
 */
const ACTOR_JOINS = Prisma.sql`
  LEFT JOIN "space_managers" sm ON sm."space_id" = a."space_id" AND sm."user_id" = a."actor_id"
  LEFT JOIN "users" au ON au."id" = a."actor_id"`;

/** The space an entry names, for the admin's log. */
const SPACE_JOIN = Prisma.sql`LEFT JOIN "spaces" es ON es."id" = a."space_id"`;

/**
 * The target, joined by its type (one join each, its type in the condition, so at most one matches;
 * a payment and a data report have none). Joins, not a lateral subquery per entry: a search over a
 * year's entries reads each table once (§12.2's measure).
 */
const TARGET_JOINS = Prisma.sql`
  LEFT JOIN "spaces" ts ON a."entity_type" = 'space' AND ts."id" = a."entity_id"
  LEFT JOIN "users" tu ON a."entity_type" = 'user' AND tu."id" = a."entity_id"
  LEFT JOIN "governorates" tg ON a."entity_type" = 'governorate' AND tg."id" = a."entity_id"
  LEFT JOIN "areas" tar ON a."entity_type" = 'area' AND tar."id" = a."entity_id"
  LEFT JOIN "amenities" tam ON a."entity_type" = 'amenity' AND tam."id" = a."entity_id"
  LEFT JOIN "customers" tc ON a."entity_type" = 'customer' AND tc."id" = a."entity_id"
  LEFT JOIN "subscriptions" tsu ON a."entity_type" = 'subscription' AND tsu."id" = a."entity_id"
  LEFT JOIN "packages" tp ON a."entity_type" = 'package' AND tp."id" = a."entity_id"
  LEFT JOIN "visits" tv ON a."entity_type" = 'visit' AND tv."id" = a."entity_id"
  LEFT JOIN "customers" tvc ON tvc."id" = tv."customer_id"
  LEFT JOIN "check_ins" tci ON a."entity_type" = 'checkIn' AND tci."id" = a."entity_id"
  LEFT JOIN "customers" tcc ON tcc."id" = tci."customer_id"
  LEFT JOIN "announcements" tan ON a."entity_type" = 'announcement' AND tan."id" = a."entity_id"`;

/**
 * The target's current name: a space's and a lookup's English (their Arabic apart); a person's, a
 * customer's, a subscription's, a package's; a visit's visitor, else its customer; a check-in's
 * customer.
 */
const TARGET_NAME = Prisma.sql`coalesce(ts."name_en", tu."name", tg."name_en", tar."name_en",
  tam."name_en", tc."name", tsu."name", tp."name", tv."visitor_name", tvc."name", tcc."name")`;
const TARGET_NAME_AR = Prisma.sql`coalesce(ts."name_ar", tg."name_ar", tar."name_ar", tam."name_ar")`;
/** A soft-deleted space or announcement. */
const TARGET_DELETED = Prisma.sql`coalesce(ts."deleted_at", tan."deleted_at") IS NOT NULL`;

/**
 * `q` against the target's names, and any other names given, as the directory searches
 * (`masaha_search_text`).
 */
const matches = (q: string, others: Prisma.Sql = Prisma.empty) =>
  Prisma.sql`strpos(masaha_search_text(concat_ws(' ', ${TARGET_NAME}, ${TARGET_NAME_AR}${others})),
    masaha_search_text(${q})) > 0`;

/** An entry's columns as the page selects them. */
interface RawRow {
  id: number;
  created_at: Date;
  action: string;
  entity_type: string;
  entity_id: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor_id: number | null;
  linked: boolean;
  actor_name: string | null;
  target_name: string | null;
  target_name_ar: string | null;
  target_deleted: boolean;
}

const ENTRY_COLUMNS = Prisma.sql`a."id", a."created_at", a."action", a."entity_type", a."entity_id",
  a."before", a."after", a."actor_id", ${TARGET_NAME} AS target_name,
  ${TARGET_NAME_AR} AS target_name_ar, ${TARGET_DELETED} AS target_deleted`;

const toRow = (row: RawRow): AuditRow => ({
  id: row.id,
  createdAt: row.created_at,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  before: row.before,
  after: row.after,
  actorId: row.actor_id,
  linked: row.linked,
  actorName: row.actor_name,
  targetName: row.target_name,
  targetNameAr: row.target_name_ar,
  targetDeleted: row.target_deleted,
});

/** The owner's actor filter: an id matches a linked person only, never an admin (S4). */
function actorIs(actor: number | 'MASAHA' | 'SYSTEM'): Prisma.Sql {
  if (actor === 'SYSTEM') return Prisma.sql`a."actor_id" IS NULL`;
  if (actor === 'MASAHA') return Prisma.sql`a."actor_id" IS NOT NULL AND sm."user_id" IS NULL`;
  return Prisma.sql`a."actor_id" = ${actor} AND sm."user_id" IS NOT NULL`;
}

/** The `audit_logs` table, read: the audit module writes nothing (docs/backend/conventions.md §6). */
export function createAuditRepository() {
  return {
    /**
     * A page of the space's entries the filter keeps, newest first, then by id; how many it keeps;
     * and the actors of the entries every filter but the actor's keeps (at most 50, persons by name,
     * then the platform, then the system). Three statements in parallel, sharing one `WHERE`
     * (conventions §5); the target's names are read only where the page or `q` needs them.
     */
    async spaceLog(
      spaceId: number,
      { since, q, actions, actor }: SpaceLogFilter,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: AuditRow[]; total: number; actors: ActorRow[] }> {
      const shared = [Prisma.sql`a."space_id" = ${spaceId}`];
      if (since) shared.push(Prisma.sql`a."created_at" >= ${since}`);
      if (actions) shared.push(Prisma.sql`a."action" = ANY(${[...actions]}::text[])`);
      if (q !== undefined) shared.push(matches(q));
      const all = actor === undefined ? shared : [...shared, actorIs(actor)];
      const where = Prisma.join(all, ' AND ');
      const actorsWhere = Prisma.join(shared, ' AND ');
      const searchJoin = q === undefined ? Prisma.empty : TARGET_JOINS;

      const [rows, [count], actors] = await Promise.all([
        prisma.$queryRaw<RawRow[]>`
          SELECT ${ENTRY_COLUMNS}, sm."user_id" IS NOT NULL AS linked,
            CASE WHEN sm."user_id" IS NOT NULL THEN au."name" END AS actor_name
          FROM "audit_logs" a ${ACTOR_JOINS} ${TARGET_JOINS}
          WHERE ${where}
          ORDER BY a."created_at" DESC, a."id" DESC LIMIT ${take} OFFSET ${skip}`,
        prisma.$queryRaw<{ total: number }[]>`
          SELECT count(*)::integer AS total FROM "audit_logs" a ${ACTOR_JOINS} ${searchJoin}
          WHERE ${where}`,
        prisma.$queryRaw<ActorRow[]>`
          SELECT kind, id, name FROM (
            SELECT DISTINCT
              CASE WHEN a."actor_id" IS NULL THEN 'SYSTEM'
                WHEN sm."user_id" IS NULL THEN 'MASAHA' ELSE 'PERSON' END AS kind,
              CASE WHEN sm."user_id" IS NOT NULL THEN a."actor_id" END AS id,
              CASE WHEN sm."user_id" IS NOT NULL THEN au."name" END AS name
            FROM "audit_logs" a ${ACTOR_JOINS} ${searchJoin}
            WHERE ${actorsWhere}
          ) actors
          ORDER BY CASE kind WHEN 'PERSON' THEN 0 WHEN 'MASAHA' THEN 1 ELSE 2 END, name, id
          LIMIT ${ACTORS_MAX}`,
      ]);
      return {
        rows: rows.map(toRow),
        total: count?.total ?? 0,
        actors,
      };
    },

    /**
     * A page of the platform's events the filter keeps (D3's list, default deny), of every space and
     * of none, newest first, then by id; how many it keeps; and the actors every filter but the
     * actor's keeps (at most 50, by name). Each entry with the space it names, whose names `q` also
     * matches. Three statements in parallel, sharing one `WHERE`.
     */
    async platformLog(
      { since, q, actions, actor }: PlatformLogFilter,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: PlatformAuditRow[]; total: number; actors: ActorRow[] }> {
      const shared = [platformEventsSql()];
      if (since) shared.push(Prisma.sql`a."created_at" >= ${since}`);
      if (actions) shared.push(Prisma.sql`a."action" = ANY(${[...actions]}::text[])`);
      if (q !== undefined) shared.push(matches(q, Prisma.sql`, es."name_en", es."name_ar"`));
      const all = actor === undefined ? shared : [...shared, Prisma.sql`a."actor_id" = ${actor}`];
      const where = Prisma.join(all, ' AND ');
      const actorsWhere = Prisma.join(shared, ' AND ');
      const searchJoins =
        q === undefined ? Prisma.empty : Prisma.sql`${SPACE_JOIN} ${TARGET_JOINS}`;

      const [rows, [count], actors] = await Promise.all([
        prisma.$queryRaw<
          (RawRow & {
            space_id: number | null;
            space_name_en: string | null;
            space_name_ar: string | null;
            space_deleted: boolean | null;
          })[]
        >`
          SELECT ${ENTRY_COLUMNS}, true AS linked, au."name" AS actor_name, es."id" AS space_id,
            es."name_en" AS space_name_en, es."name_ar" AS space_name_ar,
            es."deleted_at" IS NOT NULL AS space_deleted
          FROM "audit_logs" a LEFT JOIN "users" au ON au."id" = a."actor_id" ${SPACE_JOIN}
            ${TARGET_JOINS}
          WHERE ${where}
          ORDER BY a."created_at" DESC, a."id" DESC LIMIT ${take} OFFSET ${skip}`,
        prisma.$queryRaw<{ total: number }[]>`
          SELECT count(*)::integer AS total FROM "audit_logs" a ${searchJoins} WHERE ${where}`,
        prisma.$queryRaw<ActorRow[]>`
          SELECT kind, id, name FROM (
            SELECT DISTINCT CASE WHEN a."actor_id" IS NULL THEN 'SYSTEM' ELSE 'PERSON' END AS kind,
              a."actor_id" AS id, au."name" AS name
            FROM "audit_logs" a LEFT JOIN "users" au ON au."id" = a."actor_id" ${searchJoins}
            WHERE ${actorsWhere}
          ) actors
          ORDER BY CASE kind WHEN 'PERSON' THEN 0 ELSE 2 END, name, id
          LIMIT ${ACTORS_MAX}`,
      ]);
      return {
        rows: rows.map((row) => ({
          ...toRow(row),
          space:
            row.space_id === null || row.space_name_en === null
              ? null
              : {
                  id: row.space_id,
                  nameEn: row.space_name_en,
                  nameAr: row.space_name_ar,
                  deleted: row.space_deleted ?? false,
                },
        })),
        total: count?.total ?? 0,
        actors,
      };
    },
  };
}
