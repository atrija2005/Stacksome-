import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

const C = {
  orange: '#FF6719', orangeLight: '#FFF3EC', orangeBorder: '#FFD4B8',
  ink: '#0a0a0a', muted: '#777', rule: '#E8E6E2', soft: '#FAFAF8',
  blue: '#0050c8',
};

const TOPICS = [
  { label: 'Finance',        icon: '📈' },
  { label: 'Investing',      icon: '💰' },
  { label: 'Manufacturing',  icon: '🏭' },
  { label: 'Technology',     icon: '⚙️'  },
  { label: 'AI & ML',        icon: '🤖' },
  { label: 'Startups',       icon: '🚀' },
  { label: 'Philosophy',     icon: '🧠' },
  { label: 'Psychology',     icon: '🔬' },
  { label: 'Geopolitics',    icon: '🌍' },
  { label: 'History',        icon: '📜' },
  { label: 'Science',        icon: '⚗️'  },
  { label: 'Health',         icon: '❤️'  },
  { label: 'Business',       icon: '🏢' },
  { label: 'Leadership',     icon: '🎯' },
  { label: 'Economics',      icon: '📊' },
  { label: 'Design',         icon: '✏️'  },
  { label: 'Climate',        icon: '🌱' },
  { label: 'Media',          icon: '📰' },
  { label: 'Law & Policy',   icon: '⚖️'  },
  { label: 'Culture',        icon: '🎨' },
];

const ROLES = [
  'Founder', 'Investor', 'Operator / Executive', 'Student',
  'Researcher', 'Curious thinker',
];

const GOALS = [
  'Go deeper on what I already know',
  'Find blind spots in my thinking',
  'Challenge my beliefs',
  'Stay sharp across disciplines',
  'Find ideas to act on',
];

function Chip({ label, icon, selected, onClick, size = 'md' }) {
  const pad = size === 'sm' ? '7px 14px' : '9px 16px';
  const fs  = size === 'sm' ? '.78rem'   : '.83rem';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: pad, borderRadius: 24,
        fontSize: fs, fontFamily: 'var(--font-body)', fontWeight: selected ? 700 : 500,
        border: `1.5px solid ${selected ? C.orange : C.rule}`,
        background: selected ? C.orangeLight : '#fff',
        color: selected ? C.orange : C.muted,
        cursor: 'pointer', transition: 'all .15s', userSelect: 'none',
      }}
    >
      {icon && <span style={{ fontSize: '.85em' }}>{icon}</span>}
      {label}
      {selected && <span style={{ fontSize: '.65em', marginLeft: 1 }}>✓</span>}
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 24",
      fontSize: '1.15rem', fontWeight: 900, color: C.ink,
      marginBottom: '.35rem',
    }}>
      {children}
    </h2>
  );
}

function SectionDesc({ children }) {
  return (
    <p style={{
      fontFamily: 'var(--font-body)', fontSize: '.82rem',
      color: C.muted, lineHeight: 1.6, marginBottom: '1.25rem',
    }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${C.rule}`, margin: '2.5rem 0' }} />;
}

/* ── Parse existing profile text back to chips (best-effort) ─────────────── */
function parseProfile(text) {
  const t = text.toLowerCase();
  const topics = TOPICS.filter(tp => t.includes(tp.label.toLowerCase())).map(tp => tp.label);
  const role   = ROLES.find(r => t.includes(r.toLowerCase())) || '';
  const goals  = GOALS.filter(g => t.includes(g.toLowerCase().slice(0, 20)));
  // Anything after role/goals is the context
  return { topics, role, goals };
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Settings() {
  const router = useRouter();
  const toast  = useToast();

  const [activeTab, setActiveTab] = useState('interests'); // interests | publications

  // ── Interests state ──────────────────────────────────────────────────────
  const [topics,      setTopics]      = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [role,        setRole]        = useState('');
  const [goals,       setGoals]       = useState([]);
  const [context,     setContext]     = useState('');
  const [rawProfile,  setRawProfile]  = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  // ── Publications state ───────────────────────────────────────────────────
  const [publications, setPublications] = useState([]);
  const [pubStats,     setPubStats]     = useState({});
  const [pubInput,     setPubInput]     = useState('');
  const [pubLoading,   setPubLoading]   = useState(false);
  const [addingUrl,    setAddingUrl]    = useState(null);
  const [suggestions,  setSuggestions]  = useState([]);
  const [openCat,      setOpenCat]      = useState(null);

  useEffect(() => {
    loadProfile();
    loadPublications();
    fetch('/api/discovery').then(r => r.json()).then(d => setSuggestions(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function loadProfile() {
    try {
      const d = await (await fetch('/api/profile')).json();
      const text = d?.interests || '';
      setRawProfile(text);
      const parsed = parseProfile(text);
      setTopics(parsed.topics);
      setRole(parsed.role);
      setGoals(parsed.goals);
      // Put any unrecognised text in context box
      setContext(text);
    } catch {}
  }

  async function loadPublications() {
    try {
      const [pubRes, statRes] = await Promise.all([
        fetch('/api/publications'),
        fetch('/api/pub-stats'),
      ]);
      const pubs  = await pubRes.json();
      const stats = await statRes.json();
      setPublications(Array.isArray(pubs) ? pubs : []);
      const map = {};
      (Array.isArray(stats) ? stats : []).forEach(s => { map[s.id] = s; });
      setPubStats(map);
    } catch {}
  }

  // ── Build profile from chips ─────────────────────────────────────────────
  function buildProfile() {
    const parts = [];
    if (topics.length) parts.push(`Deeply interested in: ${topics.join(', ')}.`);
    if (role)          parts.push(`Role: ${role}.`);
    if (goals.length)  parts.push(`Reading goals: ${goals.join('; ')}.`);
    const extra = context.trim()
      .replace(/Deeply interested in:.*?\./g, '')
      .replace(/Role:.*?\./g, '')
      .replace(/Reading goals:.*?\./g, '')
      .trim();
    if (extra) parts.push(extra);
    return parts.join(' ');
  }

  function addCustomTopic() {
    const t = customTopic.trim();
    if (!t || topics.includes(t)) { setCustomTopic(''); return; }
    setTopics(prev => [...prev, t]);
    setCustomTopic('');
  }

  async function handleSaveInterests() {
    setSaving(true); setSaved(false);
    const profileText = buildProfile();
    try {
      await fetch('/api/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: profileText }),
      });
      setSaved(true);
      setRawProfile(profileText);
      toast('Interests saved ✓', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function handleResetProfile() {
    if (!confirm('Reset your profile? Your interest chips will be cleared.')) return;
    setTopics([]); setRole(''); setGoals([]); setContext('');
    await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: '' }),
    });
    toast('Profile reset', 'info');
  }

  // ── Publications ─────────────────────────────────────────────────────────
  async function handleAddPub(e, overrideUrl) {
    e?.preventDefault();
    const url = overrideUrl || pubInput.trim();
    if (!url) return;
    if (overrideUrl) setAddingUrl(overrideUrl); else setPubLoading(true);
    try {
      const res  = await fetch('/api/publications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) toast(data.error, 'error');
      else { toast(`Added: ${data.name}`, 'success'); setPubInput(''); loadPublications(); }
    } catch { toast('Network error', 'error'); }
    finally { setPubLoading(false); setAddingUrl(null); }
  }

  async function handleDeletePub(id, name) {
    await fetch('/api/publications', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast(`Removed: ${name}`, 'info');
    loadPublications();
  }

  async function toggleReference(id, name, makeRef) {
    await fetch('/api/publications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_reference', id, isReference: makeRef }),
    });
    toast(makeRef ? `${name} → reference` : `${name} → active`, 'info');
    loadPublications();
  }

  const trackedUrls = publications.map(p => (p.url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''));

  function healthInfo(lastFetched) {
    if (!lastFetched) return { color: '#cc0000', label: 'Never fetched' };
    const h = (Date.now() - new Date(lastFetched).getTime()) / 3600000;
    if (h < 2)  return { color: '#1a6e3a', label: 'Fresh' };
    if (h < 25) return { color: '#b07d2a', label: `${Math.round(h)}h ago` };
    return            { color: '#cc0000', label: `${Math.round(h / 24)}d ago` };
  }

  /* ── Tab style ────────────────────────────────────────────────────────── */
  const tabBtn = (t) => ({
    fontFamily: 'var(--font-body)', fontSize: '.8rem', fontWeight: activeTab === t ? 700 : 500,
    padding: '9px 20px', borderRadius: 8,
    border: `1.5px solid ${activeTab === t ? C.orange : C.rule}`,
    background: activeTab === t ? C.orangeLight : 'transparent',
    color: activeTab === t ? C.orange : C.muted,
    cursor: 'pointer', transition: 'all .15s',
  });

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
            fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900,
            color: C.ink, marginBottom: '.35rem',
          }}>
            Settings
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', color: C.muted }}>
            Update your interests, publications, and reading profile.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '2.5rem' }}>
          <button style={tabBtn('interests')} onClick={() => setActiveTab('interests')}>
            🧠 Interests
          </button>
          <button style={tabBtn('publications')} onClick={() => setActiveTab('publications')}>
            📚 Publications
            {publications.length > 0 && (
              <span style={{
                marginLeft: 6, fontSize: '.65rem', fontWeight: 700,
                background: C.orange, color: '#fff',
                padding: '1px 6px', borderRadius: 10,
              }}>
                {publications.length}
              </span>
            )}
          </button>
        </div>

        {/* ══ INTERESTS TAB ══ */}
        {activeTab === 'interests' && (
          <div>
            <SectionTitle>Topics</SectionTitle>
            <SectionDesc>
              Select every area you want Stacksome to curate for. Claude uses this to tag and filter every post.
            </SectionDesc>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
              {TOPICS.map(t => (
                <Chip
                  key={t.label} label={t.label} icon={t.icon}
                  selected={topics.includes(t.label)}
                  onClick={() => setTopics(prev => prev.includes(t.label) ? prev.filter(x => x !== t.label) : [...prev, t.label])}
                />
              ))}
            </div>

            {/* Custom topics (non-preset) */}
            {topics.filter(t => !TOPICS.find(tp => tp.label === t)).map(t => (
              <Chip
                key={t} label={t} selected
                onClick={() => setTopics(prev => prev.filter(x => x !== t))}
              />
            ))}

            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', marginBottom: '2rem' }}>
              <input
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                placeholder="Add a custom topic…"
                style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: '.82rem',
                  padding: '9px 12px', border: `1.5px solid ${C.rule}`,
                  borderRadius: 8, outline: 'none', color: C.ink, background: C.soft,
                }}
              />
              <button
                onClick={addCustomTopic}
                disabled={!customTopic.trim()}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: `1.5px solid ${C.rule}`,
                  background: customTopic.trim() ? C.ink : C.soft,
                  color: customTopic.trim() ? '#fff' : C.muted,
                  fontFamily: 'var(--font-body)', fontSize: '.8rem', fontWeight: 600,
                  cursor: customTopic.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all .15s',
                }}
              >
                Add
              </button>
            </div>

            <Divider />

            <SectionTitle>About you</SectionTitle>
            <SectionDesc>Helps Claude understand the depth and angle you want.</SectionDesc>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', fontWeight: 700, color: C.ink, marginBottom: '.6rem' }}>
              Role
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.5rem' }}>
              {ROLES.map(r => (
                <Chip key={r} label={r} size="sm" selected={role === r} onClick={() => setRole(role === r ? '' : r)} />
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', fontWeight: 700, color: C.ink, marginBottom: '.6rem' }}>
              Reading goals
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.5rem' }}>
              {GOALS.map(g => (
                <Chip
                  key={g} label={g} size="sm"
                  selected={goals.includes(g)}
                  onClick={() => setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                />
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', fontWeight: 700, color: C.ink, marginBottom: '.5rem' }}>
              Extra context <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
            </p>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={3}
              placeholder="e.g. I'm building a manufacturing startup and want rigorous, first-principles reads"
              style={{
                width: '100%', fontFamily: 'var(--font-body)', fontSize: '.85rem',
                padding: '11px 13px', border: `1.5px solid ${C.rule}`,
                borderRadius: 8, outline: 'none', color: C.ink,
                background: C.soft, resize: 'vertical', lineHeight: 1.6,
                marginBottom: '1.5rem', boxSizing: 'border-box',
              }}
            />

            <Divider />

            {/* Save / Reset */}
            <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleSaveInterests}
                disabled={saving}
                style={{
                  padding: '12px 28px', borderRadius: 8,
                  background: C.orange, color: '#fff',
                  fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700,
                  border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? .7 : 1, transition: 'all .15s',
                  boxShadow: `0 3px 12px ${C.orange}44`,
                }}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save interests'}
              </button>
              <button
                onClick={handleResetProfile}
                style={{
                  padding: '12px 20px', borderRadius: 8,
                  background: 'transparent', color: C.muted,
                  fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 500,
                  border: `1.5px solid ${C.rule}`, cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                Reset profile
              </button>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: C.muted, marginLeft: 'auto' }}>
                {topics.length} topic{topics.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Preview of what gets sent to Claude */}
            {(topics.length > 0 || role || goals.length > 0) && (
              <div style={{
                marginTop: '2rem', padding: '1rem 1.25rem',
                background: C.soft, border: `1px solid ${C.rule}`,
                borderRadius: 8,
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted,
                  marginBottom: '.5rem',
                }}>
                  What Claude sees
                </p>
                <p style={{
                  fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 14",
                  fontSize: '.82rem', color: '#444', lineHeight: 1.7, fontStyle: 'italic',
                }}>
                  {buildProfile() || '—'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ PUBLICATIONS TAB ══ */}
        {activeTab === 'publications' && (
          <div>
            <SectionTitle>Your publications</SectionTitle>
            <SectionDesc>
              Paste any Substack URL. The RSS feed is auto-detected. Posts from active publications appear in "From Your Stack".
            </SectionDesc>

            {/* Add input */}
            <form onSubmit={handleAddPub} style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
              <input
                value={pubInput} onChange={e => setPubInput(e.target.value)}
                placeholder="e.g. lenny.substack.com"
                style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: '.85rem',
                  padding: '11px 14px', border: `1.5px solid ${C.rule}`,
                  borderRadius: 8, outline: 'none', color: C.ink, background: C.soft,
                }}
              />
              <button
                type="submit" disabled={pubLoading || !pubInput.trim()}
                style={{
                  padding: '11px 20px', borderRadius: 8,
                  background: C.ink, color: '#fff',
                  fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 700,
                  border: 'none', cursor: pubLoading || !pubInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: pubLoading || !pubInput.trim() ? .5 : 1, transition: 'all .15s',
                }}
              >
                {pubLoading ? '…' : 'Add'}
              </button>
            </form>

            {/* Legend */}
            <div style={{
              display: 'flex', gap: '1.25rem', padding: '.6rem 1rem',
              background: C.soft, border: `1px solid ${C.rule}`,
              borderRadius: 6, marginBottom: '1.25rem', flexWrap: 'wrap',
            }}>
              {[
                { color: C.blue,  label: 'Active',    desc: 'Posts recommended to you' },
                { color: '#aaa',  label: 'Reference', desc: 'Shapes taste only — posts not shown' },
              ].map(x => (
                <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: C.muted }}>
                    <strong style={{ color: C.ink }}>{x.label}</strong> — {x.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Publications list */}
            {publications.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', color: C.muted, fontStyle: 'italic', padding: '1rem 0' }}>
                No publications yet. Add one above or browse the suggestions below.
              </p>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                {publications.map(pub => {
                  const stat   = pubStats[pub.id] || {};
                  const health = healthInfo(pub.last_fetched);
                  const isRef  = !!pub.is_reference;
                  return (
                    <div key={pub.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '.85rem 0', borderBottom: `1px solid ${C.rule}`,
                      gap: '.5rem', flexWrap: 'wrap', opacity: isRef ? .75 : 1,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isRef ? '#aaa' : C.blue, flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 18", fontSize: '.95rem', fontWeight: 700, color: C.ink }}>
                            {pub.name}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-body)', fontSize: '.62rem', fontWeight: 600,
                            padding: '2px 7px', borderRadius: 4,
                            color: health.color, background: `${health.color}18`,
                            border: `1px solid ${health.color}33`,
                          }}>
                            {health.label}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-body)', fontSize: '.62rem',
                            padding: '2px 7px', borderRadius: 4,
                            color: C.muted, border: `1px solid ${C.rule}`,
                          }}>
                            {stat.post_count || 0} posts
                          </span>
                        </div>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '.72rem', color: C.muted,
                          margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {pub.feed_url}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                        <button
                          onClick={() => toggleReference(pub.id, pub.name, !isRef)}
                          style={{
                            fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 600,
                            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                            border: `1.5px solid ${isRef ? C.blue : '#bbb'}`,
                            color: isRef ? C.blue : '#999', background: 'transparent',
                            transition: 'all .15s',
                          }}
                        >
                          {isRef ? 'Make active' : 'Set as ref'}
                        </button>
                        <button
                          onClick={() => handleDeletePub(pub.id, pub.name)}
                          style={{
                            fontFamily: 'var(--font-body)', fontSize: '.7rem',
                            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                            border: `1.5px solid ${C.rule}`, color: C.muted,
                            background: 'transparent', transition: 'all .15s',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Divider />

            {/* Discover section */}
            <SectionTitle>Browse & discover</SectionTitle>
            <SectionDesc>Curated publications worth following, organised by category.</SectionDesc>

            {suggestions.map(cat => (
              <div key={cat.category} style={{
                marginBottom: '.5rem', border: `1.5px solid ${C.rule}`,
                borderRadius: 8, overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenCat(openCat === cat.category ? null : cat.category)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '.85rem 1.1rem', background: openCat === cat.category ? C.soft : '#fff',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: cat.color || C.orange, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '.88rem', fontWeight: 700, color: C.ink }}>
                      {cat.category}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: C.muted }}>
                      {cat.pubs.length} pubs
                    </span>
                  </div>
                  <span style={{ color: C.muted, fontSize: '.75rem' }}>
                    {openCat === cat.category ? '▲' : '▼'}
                  </span>
                </button>

                {openCat === cat.category && (
                  <div style={{ borderTop: `1px solid ${C.rule}` }}>
                    {cat.pubs.map(pub => {
                      const already = trackedUrls.some(u => u.includes(pub.url.replace(/^https?:\/\//, '')));
                      const isAdding = addingUrl === pub.url;
                      return (
                        <div key={pub.url} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '.7rem 1.1rem', borderBottom: `1px solid ${C.rule}`,
                          background: already ? '#F6FFF9' : '#fff', gap: '1rem',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.88rem', fontWeight: 700, color: C.ink, margin: 0 }}>
                              {pub.name}
                            </p>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.74rem', color: C.muted, margin: '2px 0 0' }}>
                              {pub.desc}
                            </p>
                          </div>
                          {already ? (
                            <span style={{ fontSize: '.75rem', color: '#1a6e3a', fontWeight: 700, flexShrink: 0 }}>Added ✓</span>
                          ) : (
                            <button
                              onClick={() => handleAddPub(null, pub.url)}
                              disabled={isAdding}
                              style={{
                                padding: '6px 14px', borderRadius: 6,
                                border: `1.5px solid ${cat.color || C.orange}`,
                                background: 'transparent', color: cat.color || C.orange,
                                fontFamily: 'var(--font-body)', fontSize: '.75rem', fontWeight: 700,
                                cursor: isAdding ? 'not-allowed' : 'pointer',
                                flexShrink: 0, opacity: isAdding ? .5 : 1, transition: 'all .15s',
                              }}
                            >
                              {isAdding ? '…' : '+ Add'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
