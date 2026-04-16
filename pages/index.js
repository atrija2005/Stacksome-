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
  paper: '#F8F6F2',
  ink: '#0A0A0A',
};
const AUTO_FETCH_H = 12;

/* ── Topic chips ─────────────────────────────────────────────────────────── */
const TOPICS = [
  'AI', 'Startups', 'Technology', 'Product', 'Design',
  'Investing', 'Markets', 'FinTech', 'Economics', 'Crypto',
  'Philosophy', 'Science', 'History', 'Psychology', 'Politics',
  'Writing', 'Books', 'Culture',
  'Health', 'Longevity', 'Mental Health',
  'Geopolitics', 'Climate', 'Energy',
  'Business', 'Leadership', 'Marketing', 'Venture Capital',
  'Education', 'Productivity', 'Parenting',
];

function topicsFromInput(input) {
  return input.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function toggleTopic(current, chip) {
  const parts = current.split(',').map(s => s.trim()).filter(Boolean);
  const idx = parts.findIndex(p => p.toLowerCase() === chip.toLowerCase());
  if (idx >= 0) parts.splice(idx, 1); else parts.push(chip);
  return parts.join(', ');
}

function ChipPicker({ value, onChange }) {
  const selected = topicsFromInput(value);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
      {TOPICS.map(t => {
        const on = selected.includes(t.toLowerCase());
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(toggleTopic(value, t))}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '.72rem',
              fontWeight: on ? 700 : 500,
              padding: '6px 13px',
              borderRadius: 99,
              border: `1.5px solid ${on ? C.orange : '#E0DDD8'}`,
              background: on ? C.orange : 'transparent',
              color: on ? '#fff' : '#777',
              cursor: 'pointer',
              transition: 'all .14s',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/* ── Skeleton loader ─────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '56px 1fr',
      border: '1px solid #ECEAE6', borderRadius: 14,
      marginBottom: '1.1rem', overflow: 'hidden',
      boxShadow: '-3px 0 0 #eee',
    }}>
      <div style={{ background: '#F9F8F7', borderRight: '1px solid #ECEAE6' }} />
      <div style={{ padding: '1.25rem 1.4rem 1.1rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.65rem' }}>
          <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 110, height: 18, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: '78%', height: 22, marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '58%', height: 22, marginBottom: 14, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '90%', height: 13, marginBottom: 6, borderRadius: 3 }} />
        <div className="skeleton" style={{ width: '65%', height: 13, marginBottom: 16, borderRadius: 3 }} />
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <div className="skeleton" style={{ width: 88, height: 28, borderRadius: 20 }} />
          <div className="skeleton" style={{ width: 40, height: 28, borderRadius: 20 }} />
          <div className="skeleton" style={{ width: 40, height: 28, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Edition masthead ────────────────────────────────────────────────────── */
function EditionMasthead({ weekLabel, generatedAt, totalPosts, readCnt, readPct }) {
  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : weekLabel;

  return (
    <div className="anim-fade-in-up" style={{
      background: '#0A0A0A',
      borderRadius: 16,
      padding: 'clamp(1.5rem, 4vw, 2.25rem) clamp(1.5rem, 4vw, 2.5rem)',
      marginBottom: '2.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grain */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16,
        backgroundImage: `radial-gradient(circle at 80% 20%, rgba(255,103,25,.18) 0%, transparent 60%),
                          radial-gradient(circle at 10% 80%, rgba(0,80,200,.12) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top row: edition label + date */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1rem', flexWrap: 'wrap', gap: '.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span className="dot-pulse" />
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 800,
              letterSpacing: '.18em', textTransform: 'uppercase', color: '#FF6719',
            }}>
              Weekly Edition
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '.7rem',
            color: 'rgba(255,255,255,.35)', letterSpacing: '.04em',
          }}>
            {dateStr}
          </span>
        </div>

        {/* Big headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: "'opsz' 48",
          fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.1,
          marginBottom: '1.25rem',
          letterSpacing: '-.02em',
        }}>
          Your Curated<br />
          <span style={{ color: '#FF6719' }}>Reading List</span>
        </h1>

        {/* Stats row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.75rem', color: 'rgba(255,255,255,.5)',
            }}>
              {totalPosts} posts curated
            </span>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flex: 1, minWidth: 180 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${readPct}%`, height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, #FF6719, #FF8C4B)`,
                transition: 'width .6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
              color: readPct > 0 ? '#FF6719' : 'rgba(255,255,255,.3)',
              minWidth: 60, textAlign: 'right',
            }}>
              {readCnt}/{totalPosts} read
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHeader({ number, title, subtitle, accent, count }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '.5rem', marginBottom: '.6rem', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
          {/* Section number */}
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: accent, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: "'opsz' 24",
              fontSize: '.95rem', fontWeight: 900, color: '#fff',
            }}>{number}</span>
          </div>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontVariationSettings: "'opsz' 32",
              color: '#0a0a0a', lineHeight: 1, margin: 0,
              fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
            }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.78rem',
                color: '#888', margin: '.2rem 0 0', lineHeight: 1.5,
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {count != null && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '.65rem',
            color: accent, fontWeight: 500, letterSpacing: '.04em',
            padding: '4px 10px', borderRadius: 4,
            background: accent + '18', border: `1px solid ${accent}33`,
          }}>
            {count} posts
          </span>
        )}
      </div>
      <div style={{ height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${accent}, ${accent}22)` }} />
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
function Toolbar({ fetching, generating, refreshing, genPhase, hasList, onFetch, onGenerate, onRefresh }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: '.5rem', flexWrap: 'wrap',
      marginBottom: '2rem',
      padding: '1rem 1.25rem',
      background: '#fff',
      border: '1px solid #ECEAE6',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,.04)',
    }}>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 800,
        letterSpacing: '.14em', textTransform: 'uppercase', color: '#bbb',
        marginRight: '.25rem',
      }}>
        Actions
      </span>

      <button
        onClick={onFetch} disabled={fetching}
        style={{
          fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
          letterSpacing: '.05em', padding: '7px 16px', borderRadius: 8,
          border: '1.5px solid #E5E5E5', background: fetching ? '#fafaf8' : '#fff',
          color: fetching ? '#bbb' : '#444', cursor: fetching ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '.4rem',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { if (!fetching) { e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.background = '#f8f7f5'; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.background = '#fff'; }}
      >
        {fetching ? <><span className="spinner spinner-dark" /> Fetching…</> : '↻ Fetch Feeds'}
      </button>

      <button
        onClick={onGenerate} disabled={generating || refreshing}
        style={{
          fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
          letterSpacing: '.05em', padding: '7px 18px', borderRadius: 8,
          border: '1.5px solid #FF6719',
          background: generating ? '#FFF3EC' : '#FF6719',
          color: generating ? '#FF6719' : '#fff',
          cursor: (generating || refreshing) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '.4rem',
          transition: 'all .15s',
          boxShadow: generating ? 'none' : '0 2px 12px rgba(255,103,25,.3)',
        }}
      >
        {generating
          ? <><span className="spinner" style={{ borderColor: 'rgba(255,103,25,.2)', borderTopColor: '#FF6719' }} />
              {genPhase === 'discovering' ? 'Discovering…' : 'Curating…'}</>
          : '✦ Generate List'}
      </button>

      {hasList && (
        <button
          onClick={onRefresh} disabled={refreshing || generating}
          style={{
            fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
            letterSpacing: '.05em', padding: '7px 16px', borderRadius: 8,
            border: `1.5px solid ${C.blue}44`,
            background: refreshing ? '#EEF3FF' : 'transparent',
            color: C.blue, cursor: (refreshing || generating) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '.4rem',
            transition: 'all .15s',
          }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'refreshSpin .7s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Shuffling…' : 'New Picks'}
        </button>
      )}
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
  const [hasProfile,    setHasProfile]   = useState(null);
  // Inline onboarding state
  const [interestInput, setInterestInput] = useState('');
  const [buildingFirst, setBuildingFirst] = useState(false);
  const [buildPhase,    setBuildPhase]    = useState('');
  const [activeTopic,   setActiveTopic]   = useState(null);
  // ?start=1 forces the input form; ?interests=... pre-fills it from landing page
  const forceStart         = router.query.start === '1';
  const queryInterests     = router.query.interests ? decodeURIComponent(router.query.interests) : '';
  const autoFetchedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setHasProfile(false); setLoading(false); return; }
    loadList();
    if (queryInterests) {
      setInterestInput(queryInterests);
      setHasProfile(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadList() {
    setLoading(true);
    try {
      const data = await (await fetch('/api/weekly-list')).json();
      setList(data);
      if (data?.posts_json?.length > 0) setHasProfile(true);
      else setHasProfile(false);
    } catch {
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuildFirst() {
    const interests = interestInput.trim();
    if (!interests || buildingFirst) return;
    setBuildingFirst(true);
    setHasProfile(true);

    setBuildPhase('Saving your interests…');
    await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests }),
    }).catch(() => {});

    setBuildPhase('Scanning Substack categories for matching reads…');
    setBuildPhase('Claude is hand-picking your posts…');
    try {
      const d = await (await fetch('/api/generate-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests }),
      })).json();
      if (d.error) { toast(d.error, 'error'); setBuildingFirst(false); setBuildPhase(''); return; }
    } catch {
      toast('Something went wrong — try again', 'error');
      setBuildingFirst(false); setBuildPhase('');
      return;
    }

    setBuildPhase('Done — loading your list…');
    await loadList();
    setBuildingFirst(false);
    setBuildPhase('');
    router.replace('/', undefined, { shallow: true });
  }

  async function handleFetch() {
    setFetching(true);
    try {
      const d = await (await fetch('/api/fetch-feeds', { method: 'POST' })).json();
      localStorage.setItem('ss_last_fetch', String(Date.now()));
      d.errors?.length
        ? toast(`Fetched ${d.fetched} posts · ${d.errors.length} failed`, 'error')
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
      toast(`List ready · ${d.meta?.discoveryCount || 0} discoveries + ${d.meta?.stackCount || 0} from stack`, 'success');
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

  const allPosts      = list?.posts_json || [];

  const topicCounts = allPosts.reduce((acc, p) => {
    if (p.topic) acc[p.topic] = (acc[p.topic] || 0) + 1;
    return acc;
  }, {});
  const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t);

  const filteredPosts = activeTopic
    ? allPosts.filter(p => p.topic === activeTopic)
    : allPosts;

  const discoverPosts = filteredPosts.filter(p => p.section === 'discover');
  const stackPosts    = filteredPosts.filter(p => p.section === 'stack');
  const legacyPosts   = filteredPosts.filter(p => !p.section);
  const hasList       = list && (allPosts.length > 0);

  const readCnt = Object.values(list?.signals || {}).filter(s => s.read).length;
  const readPct = allPosts.length ? Math.round((readCnt / allPosts.length) * 100) : 0;

  // Still checking auth/profile
  if (authLoading || hasProfile === null) {
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            height: 160, borderRadius: 16, marginBottom: '2rem',
            background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
          }} className="skeleton" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  // No list yet — show marketing landing page
  if (!hasProfile && !forceStart && !buildingFirst) {
    return <LandingPage />;
  }

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ══════════════════════════════════════════════════════════════════
            ONBOARDING / EMPTY STATE
            ════════════════════════════════════════════════════════════════ */}
        {!loading && (forceStart || buildingFirst || !hasList) && (
          <div className="anim-fade-in-up" style={{ maxWidth: 520, margin: '3rem auto', padding: '0 1rem' }}>

            {/* Building overlay */}
            {buildingFirst && (
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${C.orange}, #c94a00)`,
                  margin: '0 auto 1.75rem',
                  boxShadow: `0 0 50px ${C.orange}55`,
                  animation: 'orbPulse 2s ease-in-out infinite',
                }} />
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 36",
                  fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: 900,
                  color: '#0a0a0a', marginBottom: '.6rem',
                }}>
                  Curating your list…
                </h2>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.9rem',
                  color: C.muted, marginBottom: '2rem', lineHeight: 1.7,
                }}>
                  {buildPhase}
                </p>
                <div style={{ height: 4, background: '#f0ede8', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})`,
                    borderRadius: 2,
                    animation: 'progressFill 18s ease-out forwards',
                  }} />
                </div>
                <style>{`
                  @keyframes progressFill { 0%{width:3%} 30%{width:35%} 65%{width:72%} 90%{width:91%} 100%{width:96%} }
                  @keyframes orbPulse { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.05)} }
                `}</style>
              </div>
            )}

            {/* Interest input form */}
            {!buildingFirst && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: C.orange, margin: '0 auto 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                    boxShadow: `0 4px 20px ${C.orange}55`,
                  }}>
                    ✦
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 36",
                    fontSize: 'clamp(1.7rem,4vw,2.3rem)',
                    fontWeight: 900, color: '#0a0a0a', marginBottom: '.6rem',
                  }}>
                    What do you want to read about?
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '.92rem',
                    color: C.muted, lineHeight: 1.7,
                  }}>
                    Type anything — topics, industries, ideas, questions.<br />
                    We'll find the best Substack posts that match.
                  </p>
                </div>

                {/* Topic chips */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '.63rem', fontWeight: 700,
                    letterSpacing: '.12em', textTransform: 'uppercase',
                    color: '#bbb', marginBottom: '.6rem',
                  }}>
                    Tap your topics
                  </p>
                  <ChipPicker value={interestInput} onChange={setInterestInput} />
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: '1rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '.65rem', color: '#ccc', letterSpacing: '.08em' }}>
                    or describe in your own words
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
                </div>

                <textarea
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && interestInput.trim()) {
                      handleBuildFirst();
                    }
                  }}
                  rows={2}
                  placeholder="e.g. &quot;I'm building a fintech startup&quot;, &quot;Philosophy and long-form essays&quot;…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: 'var(--font-body)', fontSize: '.95rem',
                    padding: '14px 16px',
                    border: `1.5px solid ${interestInput.trim() ? C.orange : '#e5e5e5'}`,
                    borderRadius: 10, outline: 'none', color: '#0a0a0a',
                    lineHeight: 1.6, resize: 'none', background: '#fafaf8',
                    transition: 'border-color .2s',
                    marginBottom: '1rem',
                  }}
                />

                <button
                  onClick={handleBuildFirst}
                  disabled={!interestInput.trim()}
                  style={{
                    width: '100%', padding: '15px',
                    borderRadius: 10,
                    background: interestInput.trim() ? C.orange : '#e5e5e5',
                    color: interestInput.trim() ? '#fff' : '#aaa',
                    fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
                    border: 'none',
                    cursor: interestInput.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: interestInput.trim() ? `0 4px 20px ${C.orange}44` : 'none',
                    transition: 'all .2s',
                    marginBottom: '.75rem',
                  }}
                >
                  ✦ Find my reads
                </button>

                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.73rem',
                  color: '#bbb', textAlign: 'center',
                }}>
                  ⌘ + Enter · Takes ~15 seconds · Searches 100+ Substack publications
                </p>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            READING LIST — shown when list exists
            ════════════════════════════════════════════════════════════════ */}
        {!loading && hasList && !forceStart && !buildingFirst && (
          <>
            {/* Edition masthead card */}
            <EditionMasthead
              weekLabel={list.week_label}
              generatedAt={list.generated_at}
              totalPosts={allPosts.length}
              readCnt={readCnt}
              readPct={readPct}
            />

            {/* Toolbar */}
            <Toolbar
              fetching={fetching}
              generating={generating}
              refreshing={refreshing}
              genPhase={genPhase}
              hasList={hasList}
              onFetch={handleFetch}
              onGenerate={handleGenerate}
              onRefresh={handleRefresh}
            />

            {/* ── Topic filter pills ─────────────────────────────────────── */}
            {topics.length > 1 && (
              <div style={{
                display: 'flex', gap: '.4rem', flexWrap: 'wrap',
                marginBottom: '2rem',
              }}>
                <button
                  onClick={() => setActiveTopic(null)}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
                    letterSpacing: '.08em', textTransform: 'uppercase',
                    padding: '5px 13px', borderRadius: 20,
                    border: `1.5px solid ${!activeTopic ? C.orange : '#E0DDD8'}`,
                    background: !activeTopic ? C.orange : 'transparent',
                    color: !activeTopic ? '#fff' : '#999',
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
                      fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      padding: '5px 13px', borderRadius: 20,
                      border: `1.5px solid ${activeTopic === t ? C.orange : '#E0DDD8'}`,
                      background: activeTopic === t ? C.orange : 'transparent',
                      color: activeTopic === t ? '#fff' : '#999',
                      cursor: 'pointer', transition: 'all .15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t}
                    <span style={{ marginLeft: 5, opacity: .55, fontWeight: 400 }}>
                      {topicCounts[t]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* ── Section 1: Fresh Discoveries ──────────────────────────── */}
            {discoverPosts.length > 0 && (
              <div style={{ marginBottom: '3.5rem' }}>
                <SectionHeader
                  number="01"
                  title="Fresh Discoveries"
                  subtitle="Publications you've never read — matched to your interests"
                  accent={C.orange}
                  count={discoverPosts.length}
                />
                <div>
                  {discoverPosts.map((post, i) => (
                    <PostCard
                      key={post.url} post={post} index={i + 1}
                      weekLabel={list.week_label}
                      initialSignals={list.signals || {}}
                      animDelay={80 + i * 55}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Divider ────────────────────────────────────────────────── */}
            {discoverPosts.length > 0 && stackPosts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '0 0 2.5rem' }}>
                <div style={{ flex: 1, height: 1, background: '#ECEAE6' }} />
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '.62rem',
                  fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                  color: '#ccc', whiteSpace: 'nowrap',
                }}>
                  also from your stack
                </span>
                <div style={{ flex: 1, height: 1, background: '#ECEAE6' }} />
              </div>
            )}

            {/* ── Section 2: From Your Stack ────────────────────────────── */}
            {stackPosts.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <SectionHeader
                  number="02"
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
                      animDelay={80 + i * 55}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Legacy list ───────────────────────────────────────────── */}
            {discoverPosts.length === 0 && stackPosts.length === 0 && legacyPosts.length > 0 && (
              <div>
                <div style={{
                  padding: '.75rem 1.1rem', borderRadius: 8, marginBottom: '1.5rem',
                  background: '#FFF8EC', border: '1px solid #FFE0B5',
                  fontFamily: 'var(--font-body)', fontSize: '.8rem', color: '#AA7020',
                }}>
                  This is an older list. Hit <strong>Generate List</strong> above for the new section layout.
                </div>
                {legacyPosts.map((post, i) => (
                  <PostCard
                    key={post.url} post={post} index={i + 1}
                    weekLabel={list.week_label}
                    initialSignals={list.signals || {}}
                    animDelay={80 + i * 55}
                  />
                ))}
              </div>
            )}

            {/* ── Footer stats ──────────────────────────────────────────── */}
            <div style={{
              paddingTop: '1.5rem', marginTop: '.5rem',
              borderTop: '1px solid #ECEAE6',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '.5rem',
            }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: '#ccc' }}>
                {discoverPosts.length > 0 && `${discoverPosts.length} discoveries`}
                {discoverPosts.length > 0 && stackPosts.length > 0 && ' · '}
                {stackPosts.length > 0 && `${stackPosts.length} from stack`}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: '#ccc' }}>
                Curated by <span style={{ fontWeight: 600, color: C.orange }}>Claude</span>
                <span style={{ margin: '0 .4rem', opacity: .4 }}>·</span>
                <span style={{ fontWeight: 500, color: '#bbb' }}>Stacksome</span>
              </p>
            </div>
          </>
        )}

        {/* ── Loading skeletons ──────────────────────────────────────────── */}
        {loading && (
          <div>
            <div className="skeleton" style={{ borderRadius: 16, height: 180, marginBottom: '2rem' }} />
            {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
