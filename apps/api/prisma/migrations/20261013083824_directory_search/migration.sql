-- The public directory's search (docs/architecture/data-model.md › Conventions): a typo-tolerant
-- match through pg_trgm's similarity, over text normalised by one function, which the stored names
-- and the query both go through. Prisma compares neither extensions nor functions, so later
-- migrations leave both alone.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Text as the search compares it: lowercased; tashkeel (U+064B–U+065F, U+0670) and tatweel
-- (U+0640) removed; the alef forms أ إ آ ٱ folded into ا, ة into ه and ى into ي; runs of
-- whitespace one space, trimmed.
CREATE FUNCTION masaha_search_text(text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  RETURN btrim(regexp_replace(
    translate(lower(regexp_replace($1, '[\u064B-\u065F\u0670\u0640]', '', 'g')),
              'أإآٱىة', 'اااايه'),
    '\s+', ' ', 'g'));

-- How well a query matches a text, from 0 to 1: 1 when the text holds the query, both normalised;
-- otherwise how closely the query matches some part of the text, trigram by trigram, so a typo
-- still scores. A missing text scores 0.
CREATE FUNCTION masaha_search_score(query text, target text) RETURNS real
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN CASE
    WHEN target IS NULL THEN 0
    WHEN strpos(masaha_search_text(target), masaha_search_text(query)) > 0 THEN 1
    ELSE word_similarity(masaha_search_text(query), masaha_search_text(target))
  END;
