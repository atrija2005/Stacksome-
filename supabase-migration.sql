-- ═══════════════════════════════════════════════════════════════
-- Stacksome Supabase Migration v2
-- Run this in the Supabase SQL Editor (supabase.com dashboard)
-- Drop & recreate — safe to re-run on a fresh project
-- ═══════════════════════════════════════════════════════════════

-- ── DROP EXISTING (clean slate) ───────────────────────────────
DROP TABLE IF EXISTS post_signals  CASCADE;
DROP TABLE IF EXISTS weekly_lists  CASCADE;
DROP TABLE IF EXISTS posts         CASCADE;
DROP TABLE IF EXISTS publications  CASCADE;
DROP TABLE IF EXISTS profile       CASCADE;
DROP FUNCTION IF EXISTS get_user_stats(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;

-- ── TABLES (no FK to auth.users — supports demo bypass user) ──

CREATE TABLE publications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL,
  url           TEXT NOT NULL,
  feed_url      TEXT NOT NULL,
  name          TEXT NOT NULL,
  is_reference  BOOLEAN NOT NULL DEFAULT FALSE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_fetched  TIMESTAMPTZ,
  UNIQUE (user_id, url)
);

CREATE TABLE posts (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL,
  publication_id  BIGINT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  url             TEXT NOT NULL,
  published_at    TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);

CREATE TABLE profile (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE,
  interests   TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weekly_lists (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL,
  week_label    TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  posts_json    JSONB NOT NULL
);

CREATE TABLE post_signals (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  post_url    TEXT NOT NULL,
  -- 'up', 'read', 'down', 'down:off-topic', 'down:too-basic', 'down:know-it'
  signal      TEXT NOT NULL,
  week_label  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_url, signal)
);

-- ── INDEXES ───────────────────────────────────────────────────

CREATE INDEX idx_publications_user     ON publications(user_id);
CREATE INDEX idx_posts_user            ON posts(user_id);
CREATE INDEX idx_posts_pub             ON posts(publication_id);
CREATE INDEX idx_posts_user_fetched    ON posts(user_id, fetched_at DESC);
CREATE INDEX idx_posts_user_published  ON posts(user_id, published_at DESC);
CREATE INDEX idx_weekly_lists_user     ON weekly_lists(user_id);
CREATE INDEX idx_weekly_lists_user_gen ON weekly_lists(user_id, generated_at DESC);
CREATE INDEX idx_post_signals_user     ON post_signals(user_id);
CREATE INDEX idx_post_signals_week     ON post_signals(user_id, week_label);
CREATE INDEX idx_post_signals_url      ON post_signals(user_id, post_url);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- Disabled — service role key bypasses RLS anyway.
-- Enable only when real Google OAuth is added.

ALTER TABLE publications DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts        DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile      DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_signals DISABLE ROW LEVEL SECURITY;

-- ── STATS RPC FUNCTION ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'weeksActive',   (SELECT COUNT(*)           FROM weekly_lists  WHERE user_id = p_user_id),
    'totalRead',     (SELECT COUNT(DISTINCT post_url) FROM post_signals WHERE user_id = p_user_id AND signal = 'read'),
    'totalUp',       (SELECT COUNT(*)           FROM post_signals  WHERE user_id = p_user_id AND signal = 'up'),
    'totalDown',     (SELECT COUNT(*)           FROM post_signals  WHERE user_id = p_user_id AND signal = 'down'),
    'totalPosts',    (SELECT COUNT(*)           FROM posts         WHERE user_id = p_user_id),
    'pubSignals', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT pub.name, pub.url, COUNT(*) as up_count
        FROM post_signals ps
        JOIN posts p   ON ps.post_url = p.url AND p.user_id = p_user_id
        JOIN publications pub ON p.publication_id = pub.id
        WHERE ps.signal = 'up' AND ps.user_id = p_user_id
        GROUP BY pub.id, pub.name, pub.url
        ORDER BY up_count DESC LIMIT 10
      ) t
    ),
    'weeklyTrends', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT wl.week_label,
               COUNT(DISTINCT ps.post_url) as read_count,
               10 as total
        FROM weekly_lists wl
        LEFT JOIN post_signals ps
          ON ps.week_label = wl.week_label AND ps.signal = 'read' AND ps.user_id = p_user_id
        WHERE wl.user_id = p_user_id
        GROUP BY wl.week_label, wl.generated_at
        ORDER BY wl.generated_at ASC
        LIMIT 12
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
