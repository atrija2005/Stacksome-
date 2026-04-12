/**
 * Stacksome Database Layer — Supabase (Postgres)
 *
 * All functions are async and take (supabase, userId?, ...) where
 * `supabase` is an authenticated server client with RLS scoped to the user.
 */

// ── Publications ──────────────────────────────────────────────────────────────

async function getPublications(supabase) {
  const { data, error } = await supabase
    .from('publications')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function addPublication(supabase, userId, url, feedUrl, name) {
  const { data, error } = await supabase
    .from('publications')
    .upsert(
      { user_id: userId, url, feed_url: feedUrl, name },
      { onConflict: 'user_id,url', ignoreDuplicates: true }
    )
    .select()
    .single();
  if (error && error.code !== '23505') throw error;
  return data;
}

async function setPublicationReference(supabase, id, isReference) {
  const { error } = await supabase
    .from('publications')
    .update({ is_reference: isReference })
    .eq('id', id);
  if (error) throw error;
}

async function deletePublication(supabase, id) {
  const { error } = await supabase
    .from('publications')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function updateLastFetched(supabase, id) {
  const { error } = await supabase
    .from('publications')
    .update({ last_fetched: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Posts ──────────────────────────────────────────────────────────────────────

async function upsertPost(supabase, userId, pubId, title, desc, url, publishedAt) {
  const { error } = await supabase
    .from('posts')
    .upsert(
      {
        user_id: userId,
        publication_id: pubId,
        title,
        description: (desc || '').slice(0, 500),
        url,
        published_at: publishedAt || new Date().toISOString(),
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,url' }
    );
  if (error && error.code !== '23505') throw error;
}

async function getRecentPosts(supabase, days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  let { data, error } = await supabase
    .from('posts')
    .select('*, publications!inner(name, url, is_reference)')
    .or(`fetched_at.gte.${cutoff},published_at.gte.${cutoff}`)
    .order('published_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  if (!data || data.length < 5) {
    const fallback = await supabase
      .from('posts')
      .select('*, publications!inner(name, url, is_reference)')
      .order('fetched_at', { ascending: false })
      .limit(100);
    if (fallback.error) throw fallback.error;
    data = fallback.data || [];
  }

  return data.map(p => ({
    ...p,
    publication_name: p.publications?.name || 'Unknown',
    publication_url: p.publications?.url || '',
  }));
}

async function getPostsByType(supabase, days = 30) {
  const allPosts = await getRecentPosts(supabase, days);
  return {
    active: allPosts.filter(p => !p.publications?.is_reference),
    reference: allPosts.filter(p => !!p.publications?.is_reference),
  };
}

// ── Profile ───────────────────────────────────────────────────────────────────

async function getProfile(supabase) {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || { interests: '' };
}

async function updateProfile(supabase, userId, interests) {
  const { error } = await supabase
    .from('profile')
    .upsert(
      { user_id: userId, interests, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ── Weekly Lists ──────────────────────────────────────────────────────────────

async function saveWeeklyList(supabase, userId, weekLabel, postsJson) {
  const { error } = await supabase
    .from('weekly_lists')
    .insert({
      user_id: userId,
      week_label: weekLabel,
      posts_json: postsJson,
    });
  if (error) throw error;
}

async function getLatestWeeklyList(supabase) {
  const { data, error } = await supabase
    .from('weekly_lists')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getAllWeeklyLists(supabase) {
  const { data, error } = await supabase
    .from('weekly_lists')
    .select('id, week_label, generated_at')
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getWeeklyListById(supabase, id) {
  const { data, error } = await supabase
    .from('weekly_lists')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ── Signals ───────────────────────────────────────────────────────────────────

async function upsertSignal(supabase, userId, postUrl, signal, weekLabel) {
  const { error } = await supabase
    .from('post_signals')
    .upsert(
      {
        user_id: userId,
        post_url: postUrl,
        signal,
        week_label: weekLabel,
      },
      { onConflict: 'user_id,post_url,signal' }
    );
  if (error) throw error;
}

async function getSignalsForWeek(supabase, weekLabel) {
  const { data, error } = await supabase
    .from('post_signals')
    .select('*')
    .eq('week_label', weekLabel);
  if (error) throw error;
  return data || [];
}

async function getAllSignals(supabase) {
  const { data, error } = await supabase
    .from('post_signals')
    .select('*');
  if (error) throw error;
  return data || [];
}

async function getSignalsByUrl(supabase, postUrl) {
  const { data, error } = await supabase
    .from('post_signals')
    .select('*')
    .eq('post_url', postUrl);
  if (error) throw error;
  return data || [];
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function getStats(supabase, userId) {
  const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: userId });
  if (error) throw error;
  return data || {};
}

async function getPublicationStats(supabase) {
  const { data, error } = await supabase
    .from('publications')
    .select('id, name, url, posts(count)');
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    url: p.url,
    post_count: p.posts?.[0]?.count || 0,
  }));
}

module.exports = {
  getPublications,
  addPublication,
  setPublicationReference,
  deletePublication,
  updateLastFetched,
  upsertPost,
  getRecentPosts,
  getPostsByType,
  getProfile,
  updateProfile,
  saveWeeklyList,
  getLatestWeeklyList,
  getAllWeeklyLists,
  getWeeklyListById,
  upsertSignal,
  getSignalsForWeek,
  getAllSignals,
  getSignalsByUrl,
  getStats,
  getPublicationStats,
};
