-- Raw SQL: Prisma models no function, so it creates none and later migrations leave this one alone.

-- A subscription's attendance and amount due (docs/architecture/data-model.md › Derived values), for the
-- set-based reads: one row per subscription of the space (of one customer, when given). A day is used by any
-- check-in on it, open or closed; minutes count closed stays only, whole minutes each. The week's start is
-- the caller's (the shared calendar's Saturday), never computed here. Prisma compares no function, so later
-- migrations leave it alone; src/db/subscriptions.api.test.ts proves it.
CREATE FUNCTION "subscription_usage"(p_space_id integer, p_customer_id integer, p_today date, p_week_start date)
RETURNS TABLE ("subscription_id" integer, "customer_id" integer, "usage_based" boolean,
               "days_used" integer, "days_this_week" integer, "minutes_used" integer,
               "minutes_today" integer, "due_agorot" integer)
LANGUAGE sql STABLE AS $$
  SELECT s."id", s."customer_id", s."billing" <> 'FIXED',
         count(DISTINCT c.day)::integer,
         count(DISTINCT c.day) FILTER (WHERE c.day >= p_week_start AND c.day <= p_today)::integer,
         coalesce(sum(c.minutes), 0)::integer,
         coalesce(sum(c.minutes) FILTER (WHERE c.day = p_today), 0)::integer,
         CASE s."billing"
           WHEN 'FIXED' THEN s."price_agorot"
           WHEN 'PER_DAY' THEN count(DISTINCT c.day)::integer * s."price_agorot"
           ELSE round(coalesce(sum(c.minutes), 0) * s."price_agorot" / 60.0)::integer
         END
  FROM "subscriptions" s
  LEFT JOIN LATERAL (
    SELECT ("ci"."checked_in_at" AT TIME ZONE 'Asia/Gaza')::date AS day,
           CASE WHEN "ci"."checked_out_at" IS NULL THEN NULL
                ELSE floor(extract(epoch FROM "ci"."checked_out_at" - "ci"."checked_in_at") / 60)::integer
           END AS minutes
    FROM "check_ins" "ci" WHERE "ci"."subscription_id" = s."id"
  ) c ON true
  WHERE s."space_id" = p_space_id AND (p_customer_id IS NULL OR s."customer_id" = p_customer_id)
  GROUP BY s."id";
$$;
