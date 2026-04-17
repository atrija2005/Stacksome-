import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LandingPage from '../components/LandingPage';
import PostCard from '../components/PostCard';
import { useToast } from '../components/Toast';
import { useAuth } from '../components/AuthProvider';

const C = {
  orange: '#FF6719', orangeLight: '#FF8C4B',
  blue: '#0050c8', muted: '#6B6B6B',
  rule: '#ECEAE6', ink: '#0A0A0A',
};

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

function topicsFromInput(v) {
  return v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
function toggleTopic(current, chip) {
  const parts = current.split(',').map(s => s.trim()).filter(Boolean);
  const idx = parts.findIndex(p => p.toLowerCase() === chip.toLowerCase());
  if (idx >= 0) parts.splice(idx, 1); else parts.push(chip);
  return parts.join(', ');
}
function ChipPicker({ value, onChange }) {
  const sel = topicsFromInput(value);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
      {TOPICS.map(t => {
        const on = sel.includes(t.toLowerCase());
        return (
          <button key={t} type="button" onClick={() => onChange(toggleTopic(value, t))} style={{
            fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: on ? 700 : 500,
            padding: '6px 13px', borderRadius: 99,
            border: `1.5px solid ${on ? C.orange : '#E0DDD8'}`,
            background: on ? C.orange : 'transparent',
            color: on ? '#fff' : '#777',
            cursor: 'pointer', transition: 'all .14s', whiteSpace: 'nowrap', lineHeight: 1,
          }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}

/* ── Angle styles (deep dive) ────────────────────────────────────────────── */
const ANGLE_STYLES = {
  'Overview':      { color: '#0050c8', bg: '#EEF3FF', icon: '◎' },
  'Business Model':{ color: '#047857', bg: '#ECFDF5', icon: '◈' },
  'Key Players':   { color: '#7C3AED', bg: '#F5F3FF', icon: '◆' },
  'Bear Case':     { color: '#DC2626', bg: '#FEF2F2', icon: '▽' },
  'Consensus':     { color: '#374151', bg: '#F9FAFB', icon: '◉' },
  'Contrarian':    { color: '#FF6719', bg: '#FFF3EC', icon: '◇' },
  'Edge':          { color: '#0891B2', bg: '#ECFEFF', icon: '◈' },
};
const DEEP_ANGLES = ['Overview','Business Model','Key Players','Bear Case','Consensus','Contrarian','Edge'];

/* ── Context helpers ─────────────────────────────────────────────────────── */
function deriveContextName(interests) {
  const parts = interests.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return interests.slice(0, 28);
  if (parts.length <= 3) return parts.join(' · ');
  return parts.slice(0, 2).join(' · ') + ' +' + (parts.length - 2);
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '56px 1fr',
      border: '1px solid #ECEAE6', borderRadius: 14,
      marginBottom: '1.1rem', overflow: 'hidden', boxShadow: '-3px 0 0 #eee',
    }}>
      <div style={{ background: '#F9F8F7', borderRight: '1px solid #ECEAE6' }} />
      <div style={{ padding: '1.25rem 1.4rem 1.1rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.65rem' }}>
          <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 110, height: 18, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: '78%', height: 22, marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '58%', height: 22, marginBottom: 14, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '88%', height: 13, marginBottom: 6, borderRadius: 3 }} />
        <div className="skeleton" style={{ width: '65%', height: 13, borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ── Context switcher tabs ───────────────────────────────────────────────── */
function ContextTabs({ contexts, activeId, onSwitch, onDelete, onNew }) {
  return (
    <div style={{
      display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center',
      marginBottom: '1.5rem',
    }}>
      {contexts.map(ctx => {
        const active = ctx.id === activeId;
        return (
          <div key={ctx.id} style={{
            display: 'flex', alignItems: 'center',
            borderRadius: 99,
            border: `1.5px solid ${active ? C.orange : '#E0DDD8'}`,
            background: active ? C.orange : '#fff',
            overflow: 'hidden',
            transition: 'all .15s',
          }}>
            <button
              onClick={() => onSwitch(ctx.id)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                padding: '7px 12px 7px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? '#fff' : '#555',
                letterSpacing: '.01em', whiteSpace: 'nowrap',
              }}
            >
              {ctx.name}
            </button>
            <button
              onClick={() => onDelete(ctx.id)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '.7rem',
                padding: '7px 10px 7px 4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'rgba(255,255,255,.65)' : '#bbb',
                lineHeight: 1,
              }}
              title="Remove this topic"
            >
              ×
            </button>
          </div>
        );
      })}

      <button
        onClick={onNew}
        style={{
          fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
          padding: '7px 14px', borderRadius: 99,
          border: `1.5px dashed #D0CCC8`,
          background: 'transparent', color: '#aaa',
          cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
          letterSpacing: '.02em',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.color = C.orange; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#D0CCC8'; e.currentTarget.style.color = '#aaa'; }}
      >
        + New topic
      </button>
    </div>
  );
}

/* ── Edition masthead ────────────────────────────────────────────────────── */
function EditionMasthead({ contextName, totalPosts, readCnt, readPct }) {
  const readPosts = readCnt;
  const remaining = totalPosts - readPosts;
  return (
    <div style={{
      background: '#0A0A0A', borderRadius: 16,
      padding: 'clamp(1.25rem,3vw,1.75rem) clamp(1.5rem,4vw,2.25rem)',
      marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 85% 15%, rgba(255,103,25,.2) 0%, transparent 55%),
                          radial-gradient(circle at 10% 85%, rgba(0,80,200,.1) 0%, transparent 50%)`,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.85rem' }}>
          <span className="dot-pulse" />
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '.6rem', fontWeight: 800,
            letterSpacing: '.18em', textTransform: 'uppercase', color: '#FF6719',
          }}>
            Your Curriculum
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
          fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: 900,
          color: '#fff', lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-.02em',
        }}>
          {contextName}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.73rem', color: 'rgba(255,255,255,.4)' }}>
            {remaining > 0 ? `${remaining} left to read` : totalPosts > 0 ? '✓ All read' : `${totalPosts} posts`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flex: 1, minWidth: 120 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${readPct}%`, height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, #FF6719, #FF8C4B)`,
                transition: 'width .6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '.65rem', fontWeight: 500,
              color: readPct > 0 ? '#FF6719' : 'rgba(255,255,255,.2)', minWidth: 28,
            }}>
              {readPct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
function Toolbar({ generating, refreshing, genPhase, hasPosts, onGenerate, onRefresh }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap',
      marginBottom: '1.5rem', padding: '.85rem 1.1rem',
      background: '#fff', border: '1px solid #ECEAE6',
      borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    }}>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.6rem', fontWeight: 800,
        letterSpacing: '.14em', textTransform: 'uppercase', color: '#ccc', marginRight: '.2rem',
      }}>
        Curriculum
      </span>

      <button onClick={onGenerate} disabled={generating || refreshing} style={{
        fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
        letterSpacing: '.04em', padding: '7px 18px', borderRadius: 8,
        border: `1.5px solid ${generating ? '#FFD4BC' : C.orange}`,
        background: generating ? '#FFF3EC' : C.orange,
        color: generating ? C.orange : '#fff',
        cursor: (generating || refreshing) ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '.4rem', transition: 'all .15s',
        boxShadow: generating ? 'none' : `0 2px 10px ${C.orange}44`,
      }}>
        {generating
          ? <><span className="spinner" style={{ borderColor: 'rgba(255,103,25,.2)', borderTopColor: C.orange }} />
              {genPhase === 'discovering' ? 'Discovering…' : 'Curating…'}</>
          : '✦ Rebuild list'}
      </button>

      {hasPosts && (
        <button onClick={onRefresh} disabled={refreshing || generating} style={{
          fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
          letterSpacing: '.04em', padding: '7px 16px', borderRadius: 8,
          border: `1.5px solid ${C.blue}33`,
          background: refreshing ? '#EEF3FF' : 'transparent',
          color: C.blue, cursor: (refreshing || generating) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '.4rem', transition: 'all .15s',
        }}>
          <span style={{ display: 'inline-block', animation: refreshing ? 'refreshSpin .7s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Refreshing…' : 'New picks'}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const router  = useRouter();
  const toast   = useToast();
  const { user, loading: authLoading } = useAuth();

  // ── Contexts (localStorage) ────────────────────────────────────────────
  const [contexts,     setContexts]   = useState([]);
  const [activeCtxId,  setActiveCtxId] = useState(null);
  const [loading,      setLoading]    = useState(true);

  // ── Onboarding / form ─────────────────────────────────────────────────
  const [interestInput, setInterestInput] = useState('');
  const [buildingFirst, setBuildingFirst] = useState(false);
  const [buildPhase,    setBuildPhase]    = useState('');
  const [showNewForm,   setShowNewForm]   = useState(false);
  const [diveMode,      setDiveMode]      = useState('quick'); // 'quick' | 'deep'

  // ── Goal confirmation ─────────────────────────────────────────────────
  const [confirmData,  setConfirmData]  = useState(null);  // { refinedGoal, summary, bullets, queries }
  const [confirming,   setConfirming]   = useState(false);

  // ── Curriculum completion ─────────────────────────────────────────────
  const [ctxRatings, setCtxRatings] = useState({});  // { [ctxId]: 'perfect' | 'mostly' | 'miss' }

  // ── Generation state ──────────────────────────────────────────────────
  const [generating,  setGenning]    = useState(false);
  const [genPhase,    setGenPhase]   = useState('idle');
  const [refreshing,  setRefreshing] = useState(false);

  // ── Topic filter ──────────────────────────────────────────────────────
  const [activeTopic, setActiveTopic] = useState(null);

  // ?start=1 + ?interests=... from landing page
  const forceStart     = router.query.start === '1';
  const queryInterests = router.query.interests ? decodeURIComponent(router.query.interests) : '';

  // ── Load contexts from localStorage ───────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    try {
      const saved  = JSON.parse(localStorage.getItem('ss_contexts') || '[]');
      const lastId = localStorage.getItem('ss_active_ctx') || '';
      setContexts(saved);
      setActiveCtxId(lastId && saved.find(c => c.id === lastId) ? lastId : (saved[0]?.id || null));
    } catch { /* ignore */ }
    setLoading(false);
    if (queryInterests) setInterestInput(queryInterests);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // ── Persistence helpers ───────────────────────────────────────────────
  function persistContexts(ctxs) {
    setContexts(ctxs);
    localStorage.setItem('ss_contexts', JSON.stringify(ctxs));
  }

  function switchContext(id) {
    setActiveCtxId(id);
    localStorage.setItem('ss_active_ctx', id);
    setActiveTopic(null);
    setShowNewForm(false);
  }

  function saveNewContext(interests, posts, mode = 'quick') {
    const id  = `ctx_${Date.now()}`;
    const ctx = {
      id, interests, mode,
      name: deriveContextName(interests),
      posts, signals: {},
      createdAt: new Date().toISOString(),
    };
    const updated = [...contexts, ctx];
    persistContexts(updated);
    setActiveCtxId(id);
    localStorage.setItem('ss_active_ctx', id);
    return ctx;
  }

  function updateContextInPlace(id, patch) {
    const updated = contexts.map(c => c.id === id ? { ...c, ...patch } : c);
    persistContexts(updated);
  }

  function deleteContext(id) {
    const updated = contexts.filter(c => c.id !== id);
    persistContexts(updated);
    if (activeCtxId === id) {
      const next = updated[0]?.id || null;
      setActiveCtxId(next);
      localStorage.setItem('ss_active_ctx', next || '');
    }
  }

  function handleSignalChange(url, sigData) {
    if (!activeCtxId) return;
    const updated = contexts.map(c => {
      if (c.id !== activeCtxId) return c;
      return { ...c, signals: { ...c.signals, [url]: sigData } };
    });
    persistContexts(updated);
  }

  // ── Computed from active context ──────────────────────────────────────
  const activeCtx  = contexts.find(c => c.id === activeCtxId) || null;
  const allPosts   = activeCtx?.posts || [];
  const ctxSignals = activeCtx?.signals || {};
  const hasPosts   = allPosts.length > 0;

  const topicCounts = allPosts.reduce((acc, p) => {
    if (p.topic) acc[p.topic] = (acc[p.topic] || 0) + 1;
    return acc;
  }, {});
  const topics = Object.entries(topicCounts).sort((a,b) => b[1]-a[1]).map(([t]) => t);
  const filteredPosts = activeTopic ? allPosts.filter(p => p.topic === activeTopic) : allPosts;
  const orderedPosts  = [...filteredPosts].sort((a,b) => (a.order||99) - (b.order||99));

  const readCnt = Object.values(ctxSignals).filter(s => s.read).length;
  const readPct = allPosts.length ? Math.round((readCnt / allPosts.length) * 100) : 0;
  const allRead = allPosts.length > 0 && allPosts.every(p => ctxSignals[p.url]?.read);

  // ── Build / generate helpers ──────────────────────────────────────────

  // Step 1 of 2: Expand the goal → show confirmation card
  async function handleGoalSubmit() {
    const interests = interestInput.trim();
    if (!interests || confirming) return;
    setConfirming(true);
    try {
      const res  = await fetch('/api/expand-goal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: interests, mode: diveMode }),
      });
      const data = await res.json();
      setConfirmData({
        originalGoal: interests,
        refinedGoal:  data.refinedGoal || interests,
        summary:      data.summary     || '',
        bullets:      data.bullets     || [],
        queries:      data.queries     || [],
      });
    } catch {
      // If expand-goal fails, skip confirmation and build directly
      await handleBuildFirst(interests);
    } finally {
      setConfirming(false);
    }
  }

  // Step 2 of 2: Build the curriculum using confirmed goal
  async function handleBuildFirst(goalOverride) {
    const interests = goalOverride || confirmData?.refinedGoal || interestInput.trim();
    if (!interests || buildingFirst) return;
    setConfirmData(null);
    setBuildingFirst(true);
    setBuildPhase('Saving your interests…');
    await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests }),
    }).catch(() => {});

    setBuildPhase('Searching Substack for the right posts…');
    await new Promise(r => setTimeout(r, 300));
    setBuildPhase('Claude is building your curriculum…');

    try {
      const d = await (await fetch('/api/generate-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, mode: diveMode }),
      })).json();
      if (d.error) { toast(d.error, 'error'); setBuildingFirst(false); setBuildPhase(''); return; }
      saveNewContext(interests, d.posts || [], diveMode);
      setInterestInput('');
      setShowNewForm(false);
      router.replace('/', undefined, { shallow: true });
    } catch {
      toast('Something went wrong — try again', 'error');
    }
    setBuildingFirst(false);
    setBuildPhase('');
  }

  async function generateForContext(ctxId, excludeUrls = []) {
    const ctx = contexts.find(c => c.id === ctxId);
    if (!ctx) return false;
    try {
      const d = await (await fetch('/api/generate-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: ctx.interests, excludeUrls, mode: ctx.mode || 'quick' }),
      })).json();
      if (d.error) { toast(d.error, 'error'); return false; }
      updateContextInPlace(ctxId, { posts: d.posts || [] });
      toast(`Curriculum updated · ${d.posts?.length || 0} posts`, 'success');
      return true;
    } catch { toast('Generation failed', 'error'); return false; }
  }

  async function handleGenerate() {
    if (!activeCtxId) return;
    setGenning(true);
    setGenPhase('discovering');
    await new Promise(r => setTimeout(r, 180));
    setGenPhase('ranking');
    await generateForContext(activeCtxId);
    setGenning(false);
    setGenPhase('idle');
  }

  async function handleRefresh() {
    if (!activeCtxId) return;
    setRefreshing(true);
    const current = allPosts.map(p => p.url);
    await generateForContext(activeCtxId, current);
    setRefreshing(false);
  }

  // ── Decide what to render ─────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="skeleton" style={{ borderRadius: 16, height: 150, marginBottom: '1.5rem' }} />
          {[...Array(3)].map((_, i) => <Skeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  // No user → show landing page
  if (!user) return <LandingPage />;

  // No contexts yet OR landing page redirected with start=1
  const showOnboarding = contexts.length === 0 || forceStart || showNewForm || buildingFirst;

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ══════════════════════════════════════════════════════════════════
            ONBOARDING — new context form
            ════════════════════════════════════════════════════════════════ */}
        {showOnboarding && (
          <div className="anim-fade-in-up" style={{ maxWidth: 520, margin: '2.5rem auto', padding: '0 1rem' }}>

            {/* Building overlay */}
            {buildingFirst && (
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${C.orange}, #c94a00)`,
                  margin: '0 auto 1.75rem',
                  boxShadow: `0 0 50px ${C.orange}55`,
                  animation: 'orbPulse 2s ease-in-out infinite',
                }} />
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 36",
                  fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900,
                  color: '#0a0a0a', marginBottom: '.6rem',
                }}>
                  Building your curriculum…
                </h2>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.9rem',
                  color: C.muted, marginBottom: '2rem', lineHeight: 1.7,
                }}>
                  {buildPhase}
                </p>
                <div style={{ height: 4, background: '#f0ede8', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})`,
                    animation: 'progressFill 18s ease-out forwards',
                  }} />
                </div>
                <style>{`
                  @keyframes progressFill { 0%{width:3%} 30%{width:40%} 65%{width:75%} 90%{width:92%} 100%{width:97%} }
                  @keyframes orbPulse { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.05)} }
                `}</style>
              </div>
            )}

            {/* ── Goal confirmation card ─────────────────────────────── */}
            {!buildingFirst && confirmData && (
              <div className="anim-fade-in-up" style={{
                background: '#fff', border: '1.5px solid #ECEAE6',
                borderRadius: 14, padding: '1.5rem 1.6rem',
                boxShadow: '0 4px 24px rgba(0,0,0,.07)',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: C.orange,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                  }}>✦</div>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 800,
                    letterSpacing: '.12em', textTransform: 'uppercase', color: C.orange, margin: 0,
                  }}>Here's what I'll build</p>
                </div>

                {confirmData.summary && (
                  <p style={{
                    fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 18",
                    fontSize: '1.05rem', fontWeight: 700, color: '#0a0a0a',
                    lineHeight: 1.4, marginBottom: '.9rem',
                  }}>
                    {confirmData.summary}
                  </p>
                )}

                {confirmData.bullets.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {confirmData.bullets.map((b, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '.6rem', fontWeight: 700,
                          color: C.orange, marginTop: '3px', flexShrink: 0,
                        }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', color: '#555', lineHeight: 1.5 }}>
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ display: 'flex', gap: '.6rem' }}>
                  <button
                    onClick={() => handleBuildFirst()}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 9,
                      background: C.orange, color: '#fff',
                      fontFamily: 'var(--font-body)', fontSize: '.88rem', fontWeight: 700,
                      border: 'none', cursor: 'pointer',
                      boxShadow: `0 3px 14px ${C.orange}44`,
                    }}
                  >
                    {diveMode === 'deep' ? '⬛ Build this deep dive' : '✦ Build this curriculum'}
                  </button>
                  <button
                    onClick={() => setConfirmData(null)}
                    style={{
                      padding: '11px 18px', borderRadius: 9,
                      background: 'transparent', color: '#888',
                      fontFamily: 'var(--font-body)', fontSize: '.85rem', fontWeight: 600,
                      border: '1.5px solid #E0DDD8', cursor: 'pointer',
                    }}
                  >
                    Edit goal
                  </button>
                </div>
              </div>
            )}

            {/* Interest input */}
            {!buildingFirst && !confirmData && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                  {showNewForm && contexts.length > 0 && (
                    <button
                      onClick={() => { setShowNewForm(false); setInterestInput(''); }}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: '.75rem',
                        color: '#bbb', background: 'none', border: 'none',
                        cursor: 'pointer', display: 'block', margin: '0 auto 1.25rem',
                      }}
                    >
                      ← Back
                    </button>
                  )}

                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: C.orange, margin: '0 auto 1.25rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', boxShadow: `0 4px 20px ${C.orange}55`,
                  }}>
                    ✦
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 36",
                    fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900,
                    color: '#0a0a0a', marginBottom: '.5rem',
                  }}>
                    {showNewForm ? 'New topic' : 'What do you want to go deep on?'}
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '.85rem',
                    color: C.muted, lineHeight: 1.65, marginBottom: '1.5rem',
                  }}>
                    Prep for an internship, write a sector thesis, or just go all in on a topic.
                  </p>

                  {/* Mode toggle */}
                  <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
                    {[
                      { id: 'quick', label: 'Quick read', sub: '5 posts · ordered path', icon: '→' },
                      { id: 'deep',  label: 'Deep dive',  sub: '7 posts · every angle',  icon: '⬛' },
                    ].map(m => {
                      const on = diveMode === m.id;
                      return (
                        <button key={m.id} onClick={() => setDiveMode(m.id)} style={{
                          fontFamily: 'var(--font-body)', textAlign: 'left',
                          padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                          border: `2px solid ${on ? C.orange : '#E0DDD8'}`,
                          background: on ? '#FFF3EC' : '#fff',
                          transition: 'all .15s', minWidth: 130,
                        }}>
                          <div style={{ fontSize: '.72rem', fontWeight: 800, color: on ? C.orange : '#888', marginBottom: '.2rem' }}>
                            {m.icon} {m.label}
                          </div>
                          <div style={{ fontSize: '.65rem', color: on ? '#c94a00' : '#bbb', fontWeight: 500 }}>
                            {m.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chip picker */}
                <div style={{ marginBottom: '.9rem' }}>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '.6rem', fontWeight: 800,
                    letterSpacing: '.12em', textTransform: 'uppercase',
                    color: '#ccc', marginBottom: '.55rem',
                  }}>Tap topics</p>
                  <ChipPicker value={interestInput} onChange={setInterestInput} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: '.9rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e8e5e0' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '.62rem', color: '#ccc', letterSpacing: '.06em' }}>
                    or describe your goal
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#e8e5e0' }} />
                </div>

                <textarea
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && interestInput.trim()) handleGoalSubmit();
                  }}
                  rows={2}
                  placeholder={diveMode === 'deep'
                    ? `e.g. "Prep for PE internship in FinTech" or "Sector thesis on climate tech"`
                    : `e.g. "Understand DeFi from scratch" or "Best thinking on AI"`
                  }
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: 'var(--font-body)', fontSize: '.92rem',
                    padding: '13px 16px',
                    border: `1.5px solid ${interestInput.trim() ? C.orange : '#e5e5e5'}`,
                    borderRadius: 10, outline: 'none', color: '#0a0a0a',
                    lineHeight: 1.6, resize: 'none', background: '#fafaf8',
                    transition: 'border-color .2s', marginBottom: '1rem',
                  }}
                />

                <button
                  onClick={handleGoalSubmit}
                  disabled={!interestInput.trim() || confirming}
                  style={{
                    width: '100%', padding: '14px',
                    borderRadius: 10,
                    background: interestInput.trim() ? C.orange : '#e5e5e5',
                    color: interestInput.trim() ? '#fff' : '#aaa',
                    fontFamily: 'var(--font-body)', fontSize: '.95rem', fontWeight: 700,
                    border: 'none',
                    cursor: interestInput.trim() && !confirming ? 'pointer' : 'not-allowed',
                    boxShadow: interestInput.trim() ? `0 4px 20px ${C.orange}44` : 'none',
                    transition: 'all .2s', marginBottom: '.65rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                  }}
                >
                  {confirming
                    ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                        Thinking about your goal…</>
                    : (diveMode === 'deep' ? '⬛ Plan my deep dive' : '✦ Plan my curriculum')
                  }
                </button>

                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.7rem',
                  color: '#ccc', textAlign: 'center',
                }}>
                  {diveMode === 'deep'
                    ? '7 posts · one per critical angle · built by Claude'
                    : '5 posts · ordered path · hand-picked by Claude'
                  } · takes ~15 seconds
                </p>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            READING LIST
            ════════════════════════════════════════════════════════════════ */}
        {!showOnboarding && activeCtx && (
          <>
            {/* Edition masthead */}
            <EditionMasthead
              contextName={activeCtx.name}
              totalPosts={allPosts.length}
              readCnt={readCnt}
              readPct={readPct}
            />

            {/* Context tabs */}
            <ContextTabs
              contexts={contexts}
              activeId={activeCtxId}
              onSwitch={switchContext}
              onDelete={deleteContext}
              onNew={() => { setShowNewForm(true); setInterestInput(''); }}
            />

            {/* Toolbar */}
            <Toolbar
              generating={generating}
              refreshing={refreshing}
              genPhase={genPhase}
              hasPosts={hasPosts}
              onGenerate={handleGenerate}
              onRefresh={handleRefresh}
            />

            {/* Topic filter pills */}
            {topics.length > 1 && (
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <button onClick={() => setActiveTopic(null)} style={{
                  fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
                  letterSpacing: '.07em', textTransform: 'uppercase',
                  padding: '5px 13px', borderRadius: 20,
                  border: `1.5px solid ${!activeTopic ? C.orange : '#E0DDD8'}`,
                  background: !activeTopic ? C.orange : 'transparent',
                  color: !activeTopic ? '#fff' : '#999',
                  cursor: 'pointer', transition: 'all .15s',
                }}>All</button>
                {topics.map(t => (
                  <button key={t} onClick={() => setActiveTopic(activeTopic === t ? null : t)} style={{
                    fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
                    letterSpacing: '.07em', textTransform: 'uppercase',
                    padding: '5px 13px', borderRadius: 20,
                    border: `1.5px solid ${activeTopic === t ? C.orange : '#E0DDD8'}`,
                    background: activeTopic === t ? C.orange : 'transparent',
                    color: activeTopic === t ? '#fff' : '#999',
                    cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                  }}>
                    {t}
                    <span style={{ marginLeft: 5, opacity: .55, fontWeight: 400 }}>{topicCounts[t]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Section header */}
            {hasPosts && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: activeCtx.mode === 'deep' ? '#0A0A0A' : C.orange,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.75rem', fontWeight: 900, color: '#fff',
                    }}>
                      {activeCtx.mode === 'deep' ? '⬛' : '✦'}
                    </div>
                    <div>
                      <h2 style={{
                        fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 32",
                        fontSize: 'clamp(1.1rem,2.5vw,1.45rem)', fontWeight: 900,
                        color: '#0a0a0a', margin: 0, lineHeight: 1,
                      }}>
                        {activeCtx.mode === 'deep' ? 'Deep Dive Curriculum' : 'Reading Path'}
                      </h2>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: '#999', margin: '.2rem 0 0' }}>
                        {activeCtx.mode === 'deep' ? 'One post per critical angle' : 'Ordered foundation → depth'}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '.62rem',
                    color: activeCtx.mode === 'deep' ? '#0A0A0A' : C.orange,
                    padding: '3px 9px', borderRadius: 4,
                    background: activeCtx.mode === 'deep' ? '#F0EFED' : '#FFF3EC',
                    border: `1px solid ${activeCtx.mode === 'deep' ? '#D0CCC8' : '#FFD4BC'}`,
                  }}>
                    {orderedPosts.length} posts
                  </span>
                </div>
                <div style={{ height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${activeCtx.mode === 'deep' ? '#0A0A0A' : C.orange}, transparent)` }} />
              </div>
            )}

            {/* Deep dive: angle map overview */}
            {activeCtx.mode === 'deep' && hasPosts && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '.4rem',
                marginBottom: '1.5rem',
              }}>
                {DEEP_ANGLES.map(angle => {
                  const post = allPosts.find(p => p.angle === angle);
                  const read = post && ctxSignals[post.url]?.read;
                  const as = ANGLE_STYLES[angle] || {};
                  return (
                    <div key={angle} style={{
                      display: 'flex', alignItems: 'center', gap: '.35rem',
                      padding: '4px 10px', borderRadius: 99,
                      border: `1.5px solid ${post ? as.color + '55' : '#ECEAE6'}`,
                      background: read ? as.bg : (post ? '#fff' : '#FAFAF8'),
                      opacity: post ? 1 : 0.45,
                    }}>
                      <span style={{ fontSize: '.6rem', color: post ? as.color : '#ccc' }}>
                        {read ? '✓' : (post ? '○' : '—')}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: '.62rem', fontWeight: 700,
                        color: post ? as.color : '#ccc', letterSpacing: '.04em',
                      }}>
                        {angle}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Posts */}
            <div>
              {orderedPosts.map((post, i) => (
                <PostCard
                  key={post.url}
                  post={post}
                  index={post.order || i + 1}
                  weekLabel={activeCtx.name}
                  initialSignals={ctxSignals}
                  onSignal={handleSignalChange}
                  animDelay={80 + i * 60}
                />
              ))}
            </div>

            {/* ── Curriculum completion banner ───────────────────────── */}
            {allRead && !generating && (() => {
              const rating = ctxRatings[activeCtxId];
              const nextGoal = (activeCtx?.name || '') + ' — advanced';
              return (
                <div className="anim-fade-in-up" style={{
                  marginTop: '1.5rem', marginBottom: '1rem',
                  borderRadius: 14, overflow: 'hidden',
                  border: '1.5px solid #D1FAE5',
                }}>
                  {/* Green header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
                    padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'center', gap: '.75rem',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(255,255,255,.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0,
                    }}>✓</div>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 24",
                        fontSize: '1.05rem', fontWeight: 900, color: '#fff', margin: 0,
                      }}>
                        Curriculum complete.
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: 'rgba(255,255,255,.6)', margin: '.2rem 0 0' }}>
                        You read all {allPosts.length} posts.
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ background: '#F0FDF4', padding: '1.1rem 1.5rem' }}>
                    {/* Rating */}
                    {!rating && (
                      <>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                          letterSpacing: '.1em', textTransform: 'uppercase',
                          color: '#065F46', marginBottom: '.6rem',
                        }}>
                          How was the curriculum?
                        </p>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          {[
                            { id: 'perfect', label: 'Exactly right', emoji: '🎯' },
                            { id: 'mostly',  label: 'Mostly right',  emoji: '👍' },
                            { id: 'miss',    label: 'Missed the mark', emoji: '🤔' },
                          ].map(opt => (
                            <button key={opt.id}
                              onClick={() => setCtxRatings(r => ({ ...r, [activeCtxId]: opt.id }))}
                              style={{
                                fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 600,
                                padding: '6px 14px', borderRadius: 8,
                                border: '1.5px solid #BBF7D0',
                                background: '#fff', color: '#065F46',
                                cursor: 'pointer', transition: 'all .14s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#D1FAE5'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                              {opt.emoji} {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {rating && (
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '.82rem', color: '#065F46',
                        marginBottom: '1rem',
                      }}>
                        {rating === 'perfect' && '🎯 Great — next time will be even more targeted.'}
                        {rating === 'mostly'  && '👍 Noted — Claude will dial it in.'}
                        {rating === 'miss'    && '🤔 Got it — we\'ll adjust the next one.'}
                      </p>
                    )}

                    {/* Next level CTA */}
                    <div style={{
                      borderTop: '1px solid #BBF7D0', paddingTop: '.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700, color: '#065F46', margin: 0, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                          Ready to go deeper?
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', color: '#6B7280', margin: '.2rem 0 0' }}>
                          Build the next level on this topic.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setInterestInput(nextGoal);
                          setShowNewForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 700,
                          padding: '9px 18px', borderRadius: 9,
                          background: '#047857', color: '#fff',
                          border: 'none', cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(4,120,87,.3)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Build next level →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Empty state */}
            {!hasPosts && !generating && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', color: '#bbb', marginBottom: '1rem' }}>
                  No posts yet. Hit <strong style={{ color: C.orange }}>Rebuild list</strong> to generate your curriculum.
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{
              paddingTop: '1.5rem', marginTop: '.5rem',
              borderTop: '1px solid #ECEAE6',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '.5rem',
            }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.7rem', color: '#ccc' }}>
                {orderedPosts.length} posts · {readCnt} read
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.7rem', color: '#ccc' }}>
                Curated by <span style={{ fontWeight: 600, color: C.orange }}>Claude</span>
                <span style={{ margin: '0 .4rem', opacity: .4 }}>·</span>
                <span style={{ fontWeight: 500, color: '#bbb' }}>Stacksome</span>
              </p>
            </div>
          </>
        )}

        {/* Loading skeletons */}
        {(generating || refreshing) && (
          <div style={{ marginTop: '1rem' }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
