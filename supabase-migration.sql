-- ═══════════════════════════════════════════════════════════════
-- Stacksome Supabase Migration
-- Run this in the Supabase SQL Editor (supabase.com dashboard)
-- ═══════════════════════════════════════════════════════════════

-- ── TABLES ────────────────────────────────────────────────────

CREATE TABLE publications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  interests   TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weekly_lists (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_label    TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  posts_json    JSONB NOT NULL
);

CREATE TABLE post_signals (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url    TEXT NOT NULL,
  signal      TEXT NOT NULL CHECK (signal IN ('up', 'down', 'read')),
  week_label  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_url, signal)
);

-- ── INDEXES ───────────────────────────────────────────────────

CREATE INDEX idx_publications_user ON publications(user_id);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_pub ON posts(publication_id);
CREATE INDEX idx_posts_user_fetched ON posts(user_id, fetched_at DESC);
CREATE INDEX idx_posts_user_published ON posts(user_id, published_at DESC);
CREATE INDEX idx_weekly_lists_user ON weekly_lists(user_id);
CREATE INDEX idx_weekly_lists_user_gen ON weekly_lists(user_id, generated_at DESC);
CREATE INDEX idx_post_signals_user ON post_signals(user_id);
CREATE INDEX idx_post_signals_week ON post_signals(user_id, week_label);
CREATE INDEX idx_post_signals_url ON post_signals(user_id, post_url);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own publications"
  ON publications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own posts"
  ON posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own profile"
  ON profile FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own weekly_lists"
  ON weekly_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own post_signals"
  ON post_signals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profile (user_id, interests)
  VALUES (NEW.id, '')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── STATS RPC FUNCTION ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'weeksActive', (SELECT COUNT(*) FROM weekly_lists WHERE user_id = p_user_id),
    'totalRead', (SELECT COUNT(DISTINCT post_url) FROM post_signals WHERE user_id = p_user_id AND signal = 'read'),
    'totalUp', (SELECT COUNT(*) FROM post_signals WHERE user_id = p_user_id AND signal = 'up'),
    'totalDown', (SELECT COUNT(*) FROM post_signals WHERE user_id = p_user_id AND signal = 'down'),
    'totalPosts', (SELECT COUNT(*) FROM posts WHERE user_id = p_user_id),
    'pubSignals', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT pub.name, pub.url, COUNT(*) as up_count
        FROM post_signals ps
        JOIN posts p ON ps.post_url = p.url AND p.user_id = p_user_id
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
        LEFT JOIN post_signals ps ON ps.week_label = wl.week_label AND ps.signal = 'read' AND ps.user_id = p_user_id
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
