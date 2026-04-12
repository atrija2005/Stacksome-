import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LandingPage from '../components/LandingPage';
import PostCard from '../components/PostCard';
import { useToast } from '../components/Toast';
import { useAuth } from '../components/AuthProvider';

const C = {
  orange: '#FF6719', orangeLight: '#FF8C4B',
  red: '#cc0000', blue: '#0050c8',
  muted: '#6B6B6B', rule: '#E5E5E5', soft: '#FAFAFA',
  softOrange: '#FFF3EC', softBlue: '#f0f5ff',
};
const AUTO_FETCH_H = 12;

/* ── Skeleton loader ─────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      border: '1px solid #f0ede8', borderRadius: 6,
      marginBottom: '1rem', padding: '1.4rem 1.5rem',
      borderTop: '3px solid #eee',
    }}>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.7rem' }}>
        <div className="skeleton" style={{ width: 80, height: 20 }} />
        <div className="skeleton" style={{ width: 120, height: 20 }} />
      </div>
      <div className="skeleton" style={{ width: '72%', height: 24, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '55%', height: 24, marginBottom: 14 }} />
      <div className="skeleton" style={{ width: '88%', height: 14, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: '62%', height: 14, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '40%', height: 14 }} />
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle, accent, count, badge }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{icon}</span>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontVariationSettings: "'opsz' 32",
              color: '#0a0a0a', lineHeight: 1, margin: 0,
              fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)',
            }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                color: C.muted, margin: '.25rem 0 0', lineHeight: 1.5,
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          {badge && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 600,
              letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '5px 12px', borderRadius: 4,
              background: accent, color: '#fff',
            }}>
              {badge}
            </span>
          )}
          {count != null && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.78rem',
              color: C.muted, fontWeight: 500,
            }}>
              {count} posts
            </span>
          )}
        </div>
      </div>
      <div className="section-rule" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const router = useRouter();
  const toast  = useToast();
  const { user, loading: authLoading } = useAuth();
  const [list,          setList]         = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [fetching,      setFetching]     = useState(false);
  const [generating,    setGenning]      = useState(false);
  const [genPhase,      setGenPhase]     = useState('idle');
  const [refreshing,    setRefreshing]   = useState(false);
  const [hasProfile,    setHasProfile]   = useState(null); // null = still checking
  const autoFetchedRef = useRef(false);

  // ── Auth gate: redirect unauthenticated users to landing ──────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/landing'); return; }
    // User is present — load data and check profile
    loadList();
    autoFetch();
    checkProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadList() {
    setLoading(true);
    try { setList(await (await fetch('/api/weekly-list')).json()); }
    finally { setLoading(false); }
  }

  async function checkProfile() {
    try {
      const p = await (await fetch('/api/profile')).json();
      const hasInterests = !!(p?.interests?.trim());
      setHasProfile(hasInterests);
      if (!hasInterests) {
        router.replace('/setup');
      }
    } catch {
      setHasProfile(false);
      router.replace('/setup');
    }
  }

  async function autoFetch() {
    if (autoFetchedRef.current) return;
    autoFetchedRef.current = true;
    const last = localStorage.getItem('ss_last_fetch');
    if (last && Date.now() - +last < AUTO_FETCH_H * 3.6e6) return;
    try {
      const d = await (await fetch('/api/fetch-feeds', { method: 'POST' })).json();
      localStorage.setItem('ss_last_fetch', String(Date.now()));
      if (d.fetched > 0) toast(`Auto-fetched ${d.fetched} new posts`, 'info');
    } catch {}
  }

  async function handleFetch() {
    setFetching(true);
    try {
      const d = await (await fetch('/api/fetch-feeds', { method: 'POST' })).json();
      localStorage.setItem('ss_last_fetch', String(Date.now()));
      d.errors?.length
        ? toast(`Fetched ${d.fetched} posts \u00b7 ${d.errors.length} failed`, 'error')
        : toast(`Fetched ${d.fetched} new posts`, 'success');
    } catch { toast('Fetch failed', 'error'); }
    finally { setFetching(false); }
  }

  async function generate(excludeUrls = []) {
    try {
      const d = await (await fetch('/api/generate-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeUrls }),
      })).json();
      if (d.error) { toast(d.error, 'error'); return false; }
      toast(`Curriculum ready \u00b7 ${d.meta?.discoveryCount || 0} discoveries + ${d.meta?.stackCount || 0} from your stack`, 'success');
      setActiveTopic(null);
      await loadList();
      return true;
    } catch { toast('Generation failed', 'error'); return false; }
  }

  async function handleGenerate() {
    setGenning(true);
    setGenPhase('discovering');
    await new Promise(r => setTimeout(r, 180));
    setGenPhase('ranking');
    await generate();
    setGenning(false);
    setGenPhase('idle');
  }

  async function handleRefresh() {
    setRefreshing(true);
    const currentUrls = (list?.posts_json || []).map(p => p.url);
    await generate(currentUrls);
    setRefreshing(false);
  }

  const [activeTopic, setActiveTopic] = useState(null);

  const allPosts      = list?.posts_json || [];

  // Collect unique topics from the list for filter pills
  const topicCounts = allPosts.reduce((acc, p) => {
    if (p.topic) acc[p.topic] = (acc[p.topic] || 0) + 1;
    return acc;
  }, {});
  const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t);

  // Filter posts by active topic (null = show all)
  const filteredPosts = activeTopic
    ? allPosts.filter(p => p.topic === activeTopic)
    : allPosts;

  const discoverPosts = filteredPosts.filter(p => p.section === 'discover');
  const stackPosts    = filteredPosts.filter(p => p.section === 'stack');
  const legacyPosts   = filteredPosts.filter(p => !p.section);
  const hasList       = list && (allPosts.length > 0);

  const readCnt = Object.values(list?.signals || {}).filter(s => s.read).length;
  const readPct = allPosts.length ? Math.round((readCnt / allPosts.length) * 100) : 0;

  // While profile check is in flight, show loading skeleton (prevents flash of wrong state)
  if (hasProfile === null) {
    return (
      <Layout>
        <div>
          <div className="section-rule" style={{ background: `linear-gradient(90deg, ${C.orange}, transparent)`, marginBottom: '1.5rem' }} />
          {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>

      {/* ══════════════════════════════════════════════════════════════════════
          EMPTY STATE — has profile but no list yet
          ════════════════════════════════════════════════════════════════════ */}
      {!loading && !hasList && (
        <div className="anim-fade-in-up" style={{ padding: '3rem 0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem' }}>✦</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 36",
            fontSize: 'clamp(1.6rem,4vw,2.4rem)',
            fontWeight: 900, color: '#0a0a0a', marginBottom: '.6rem',
          }}>
            Your reading list awaits
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '1rem',
            color: C.muted, marginBottom: '2.5rem',
          }}>
            Fetch your feeds and generate your first curriculum.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleFetch} disabled={fetching}>
              {fetching ? <><span className="spinner spinner-dark" /> Fetching...</> : '\u21BB Fetch Feeds'}
            </button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? <><span className="spinner" /> {genPhase === 'discovering' ? 'Discovering...' : 'Curating...'}</> : '\u2726 Generate List'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TOOLBAR — shown when a list exists
          ════════════════════════════════════════════════════════════════════ */}
      {!loading && hasList && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem',
            paddingBottom: '1.5rem', borderBottom: `1px solid ${C.rule}`,
          }}>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={handleFetch} disabled={fetching} style={{ fontSize: '.78rem', padding: '8px 18px' }}>
                {fetching ? <><span className="spinner spinner-dark" /> Fetching...</> : '\u21BB Fetch Feeds'}
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || refreshing} style={{ fontSize: '.78rem', padding: '8px 20px' }}>
                {generating ? <><span className="spinner" /> {genPhase === 'discovering' ? 'Discovering...' : 'Curating...'}</> : '\u2726 Generate'}
              </button>
              {list && (
                <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing || generating}
                  style={{ fontSize: '.78rem', padding: '8px 18px', borderColor: C.orange, color: C.orange }}>
                  <span style={{ display: 'inline-block', animation: refreshing ? 'refreshSpin .7s linear infinite' : 'none' }}>{'\u21BB'}</span>
                  {refreshing ? ' Shuffling...' : ' New Picks'}
                </button>
              )}
            </div>

            {/* Read progress */}
            {allPosts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', color: C.muted, fontWeight: 500 }}>
                  {readCnt}/{allPosts.length} read
                </span>
                <div style={{ width: 80, height: 5, background: '#f0ede8', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${readPct}%`, height: '100%', background: C.blue, borderRadius: 3, transition: 'width .4s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', color: C.blue, fontWeight: 700 }}>{readPct}%</span>
              </div>
            )}
          </div>

          {/* ── Date line ────────────────────────────────────────────────── */}
          <div style={{
            marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '.5rem',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: "'opsz' 36",
              fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              fontWeight: 900, color: '#0a0a0a',
            }}>
              Character Curriculum
            </h2>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.8rem',
              color: C.muted, fontWeight: 500,
            }}>
              {list.week_label} &middot; {new Date(list.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* ── Topic filter pills ───────────────────────────────────────── */}
          {topics.length > 1 && (
            <div style={{
              display: 'flex', gap: '.5rem', flexWrap: 'wrap',
              marginBottom: '2rem',
            }}>
              <button
                onClick={() => setActiveTopic(null)}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
                  letterSpacing: '.07em', textTransform: 'uppercase',
                  padding: '6px 14px', borderRadius: 20,
                  border: `1.5px solid ${!activeTopic ? C.orange : '#ddd'}`,
                  background: !activeTopic ? C.orange : 'transparent',
                  color: !activeTopic ? '#fff' : '#888',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                All
              </button>
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTopic(activeTopic === t ? null : t)}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
                    letterSpacing: '.07em', textTransform: 'uppercase',
                    padding: '6px 14px', borderRadius: 20,
                    border: `1.5px solid ${activeTopic === t ? C.orange : '#ddd'}`,
                    background: activeTopic === t ? C.orange : 'transparent',
                    color: activeTopic === t ? '#fff' : '#888',
                    cursor: 'pointer', transition: 'all .15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t}
                  <span style={{
                    marginLeft: 6, opacity: .6,
                    fontWeight: 400, fontSize: '.65rem',
                  }}>
                    {topicCounts[t]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Section 1: Fresh Discoveries ─────────────────────────────── */}
          {discoverPosts.length > 0 && (
            <div style={{ marginBottom: '3.5rem' }}>
              <SectionHeader
                icon="\uD83D\uDD2D"
                title="Fresh Discoveries"
                subtitle="Publications you have never read \u2014 matched to your intellectual profile"
                accent={C.orange}
                count={discoverPosts.length}
                badge="New to you"
              />
              <div>
                {discoverPosts.map((post, i) => (
                  <PostCard
                    key={post.url} post={post} index={i + 1}
                    weekLabel={list.week_label}
                    initialSignals={list.signals || {}}
                    animDelay={80 + i * 60}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Section 2: From Your Stack ───────────────────────────────── */}
          {stackPosts.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              {discoverPosts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '0 0 2rem' }}>
                  <div style={{ flex: 1, height: 1, background: C.rule }} />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '.75rem',
                    fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
                    color: C.muted, whiteSpace: 'nowrap',
                  }}>
                    Also from your stack
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.rule }} />
                </div>
              )}
              <SectionHeader
                icon="\uD83D\uDCDA"
                title="From Your Stack"
                subtitle="Top picks from the publications you already follow"
                accent={C.blue}
                count={stackPosts.length}
              />
              <div>
                {stackPosts.map((post, i) => (
                  <PostCard
                    key={post.url} post={post} index={i + 1}
                    weekLabel={list.week_label}
                    initialSignals={list.signals || {}}
                    animDelay={80 + i * 60}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Legacy list ──────────────────────────────────────────────── */}
          {discoverPosts.length === 0 && stackPosts.length === 0 && legacyPosts.length > 0 && (
            <div>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                color: C.muted, marginBottom: '1.5rem',
              }}>
                This is an older list. Regenerate for the new two-section layout.
              </p>
              {legacyPosts.map((post, i) => (
                <PostCard
                  key={post.url} post={post} index={i + 1}
                  weekLabel={list.week_label}
                  initialSignals={list.signals || {}}
                  animDelay={80 + i * 60}
                />
              ))}
            </div>
          )}

          {/* ── Footer stats ─────────────────────────────────────────────── */}
          <div style={{
            paddingTop: '1rem', borderTop: `1px solid ${C.rule}`,
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', color: C.muted }}>
              {discoverPosts.length} discoveries &middot; {stackPosts.length} from stack
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', color: C.muted }}>
              Curated by <span style={{ fontWeight: 600, color: C.orange }}>Claude</span>
              <span style={{ margin: '0 .4rem', opacity: .4 }}>·</span>
              Powered by <span style={{ fontWeight: 600 }}>At&amp;At</span>
            </p>
          </div>
        </>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div>
          <div className="section-rule" style={{ background: `linear-gradient(90deg, ${C.orange}, transparent)`, marginBottom: '1.5rem' }} />
          {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          <div className="section-rule" style={{ background: `linear-gradient(90deg, ${C.blue}, transparent)`, margin: '2.5rem 0 1.5rem' }} />
          {[...Array(2)].map((_, i) => <Skeleton key={i} />)}
        </div>
      )}
    </Layout>
  );
}
