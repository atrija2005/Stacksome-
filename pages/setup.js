import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '../components/Toast';

const C = {
  orange: '#FF6719', orangeLight: '#FFF3EC',
  ink: '#0a0a0a', muted: '#777', rule: '#E8E6E2', soft: '#FAFAF8',
  red: '#E53E3E', redLight: '#FFF5F5',
};

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: C.orange,
          display: 'inline-block',
          animation: `dotBounce .9s ease-in-out ${i * .18}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(.8); opacity: .4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

function Steps({ current, total = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '2.5rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3, borderRadius: 2,
          flex: i < current ? 1 : '0 0 10px',
          background: i < current ? C.orange : C.rule,
          transition: 'all .45s ease',
        }} />
      ))}
    </div>
  );
}

/* ── Skeleton card for loading state ─────────────────────────────────────── */
function StackSkeleton() {
  return (
    <div style={{
      border: `1.5px solid ${C.rule}`, borderRadius: 12,
      padding: '1.25rem', background: '#fff',
    }}>
      {[80, 55, 90, 70, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 16 : 12,
          width: `${w}%`,
          borderRadius: 4,
          background: C.rule,
          marginBottom: i === 0 ? 12 : 8,
          animation: 'shimmer 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

export default function Setup() {
  const router = useRouter();
  const toast  = useToast();
  const textareaRef = useRef(null);

  const [step,       setStep]      = useState(1);
  const [input,      setInput]     = useState('');
  const [thinking,   setThinking]  = useState(false);

  // Step 2 state
  const [profile,         setProfile]        = useState('');
  const [topics,          setTopics]         = useState([]);
  const [subOptions,      setSubOptions]     = useState({});  // { topic: [phrase, ...] }
  const [openTopics,      setOpenTopics]     = useState(new Set()); // which chips are expanded
  const [selectedSubs,    setSelectedSubs]   = useState({});  // { topic: Set<string> }
  const [summary,         setSummary]        = useState('');

  // Step 3 state
  const [stacks,       setStacks]      = useState([]);
  const [stacksLoading, setStacksLoading] = useState(false);
  const [stackVotes,   setStackVotes]   = useState({});  // { id: 'up' | 'down' }

  // Step 4 (publications)
  const [pubInput,      setPubInput]    = useState('');
  const [pubLoading,    setPubLoading]  = useState(false);
  const [publications,  setPublications] = useState([]);
  const [suggestions,   setSuggestions]  = useState([]);
  const [addingUrl,     setAddingUrl]    = useState(null);

  // Generating
  const [generating,  setGenerating] = useState(false);
  const [genStatus,   setGenStatus]  = useState('');

  useEffect(() => {
    fetch('/api/discovery')
      .then(r => r.json())
      .then(d => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 1 && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [step]);

  // Auto-skip Step 1 if user came from the landing page with a pre-selected token
  useEffect(() => {
    const pending = sessionStorage.getItem('ss_pending_interests');
    if (pending?.trim()) {
      sessionStorage.removeItem('ss_pending_interests');
      setInput(pending.trim());
      // Small delay so state settles before the API call
      setTimeout(async () => {
        setThinking(true);
        try {
          const res  = await fetch('/api/onboard', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: pending.trim() }),
          });
          const data = await res.json();
          if (!data.success) throw new Error('Failed');
          setProfile(data.profile);
          setTopics(data.topics || []);
          setSubOptions(data.sub_options || {});
          setSummary(data.summary || '');
          setStep(2);
        } catch {
          // fall through to Step 1 so user can still type
        } finally {
          setThinking(false);
        }
      }, 80);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Step 1 → 2: Claude interprets ───────────────────────────────────── */
  async function handleInterpret() {
    if (!input.trim() || thinking) return;
    setThinking(true);
    try {
      const res  = await fetch('/api/onboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('Failed');
      setProfile(data.profile);
      setTopics(data.topics || []);
      setSubOptions(data.sub_options || {});
      setSummary(data.summary || '');
      setOpenTopics(new Set());
      setSelectedSubs({});
      setStep(2);
    } catch {
      toast('Something went wrong — try again', 'error');
    } finally {
      setThinking(false);
    }
  }

  /* ── Toggle topic chip expansion ─────────────────────────────────────── */
  function toggleTopic(topic) {
    setOpenTopics(prev => {
      const next = new Set(prev);
      next.has(topic) ? next.delete(topic) : next.add(topic);
      return next;
    });
  }

  /* ── Toggle a sub-option ──────────────────────────────────────────────── */
  function toggleSub(topic, phrase) {
    setSelectedSubs(prev => {
      const topicSet = new Set(prev[topic] || []);
      topicSet.has(phrase) ? topicSet.delete(phrase) : topicSet.add(phrase);
      return { ...prev, [topic]: topicSet };
    });
  }

  /* ── Compute live profile preview ────────────────────────────────────── */
  function buildEnrichedProfile() {
    const allSelected = Object.entries(selectedSubs)
      .flatMap(([, set]) => [...set]);
    if (allSelected.length === 0) return profile;
    return `${profile} Specifically interested in: ${allSelected.join('; ')}.`;
  }

  /* ── Step 2 → 3: load test stacks ────────────────────────────────────── */
  async function handleConfirmTopics() {
    const enriched = buildEnrichedProfile();
    setProfile(enriched);
    setStep(3);
    setStacksLoading(true);
    setStacks([]);
    setStackVotes({});
    try {
      const selectedSubOptionsPlain = {};
      Object.entries(selectedSubs).forEach(([t, set]) => {
        selectedSubOptionsPlain[t] = [...set];
      });
      const res  = await fetch('/api/onboard-stacks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, selectedSubOptions: selectedSubOptionsPlain, profile: enriched }),
      });
      const data = await res.json();
      if (data.stacks) setStacks(data.stacks);
    } catch {
      toast('Could not load test stacks', 'error');
    } finally {
      setStacksLoading(false);
    }
  }

  /* ── Vote on a stack ──────────────────────────────────────────────────── */
  function voteStack(id, vote) {
    setStackVotes(prev => {
      if (prev[id] === vote) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: vote };
    });
  }

  /* ── Step 3 → 4: incorporate votes into profile ──────────────────────── */
  function handleConfirmStacks() {
    const liked    = stacks.filter(s => stackVotes[s.id] === 'up').map(s => s.vibe);
    const disliked = stacks.filter(s => stackVotes[s.id] === 'down').map(s => s.vibe);
    let enriched   = profile;
    if (liked.length)    enriched += ` Liked reading style: ${liked.join(', ')}.`;
    if (disliked.length) enriched += ` Not interested in: ${disliked.join(', ')}.`;
    setProfile(enriched);
    setStep(4);
  }

  /* ── Publications ─────────────────────────────────────────────────────── */
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
      else {
        toast(`Added: ${data.name}`, 'success');
        setPubInput('');
        setPublications(prev => [...prev, { url, name: data.name, id: data.pub?.id }]);
      }
    } catch { toast('Network error', 'error'); }
    finally { setPubLoading(false); setAddingUrl(null); }
  }

  async function removePub(id, name) {
    if (id) await fetch('/api/publications', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setPublications(prev => prev.filter(p => p.id !== id));
    toast(`Removed ${name}`, 'info');
  }

  const suggestedPubs = suggestions
    .filter(cat => topics.some(t =>
      cat.category.toLowerCase().includes(t.toLowerCase()) ||
      t.toLowerCase().includes(cat.category.toLowerCase())
    ))
    .flatMap(cat => cat.pubs.slice(0, 2))
    .slice(0, 5);

  const trackedUrls = publications.map(p => (p.url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''));

  /* ── Final: save + generate ───────────────────────────────────────────── */
  async function handleGenerate() {
    setStep(5);
    setGenerating(true);

    setGenStatus('Saving your profile…');
    await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: profile }),
    }).catch(() => {});

    setGenStatus('Fetching your feeds…');
    await fetch('/api/fetch-feeds', { method: 'POST' }).catch(() => {});

    setGenStatus('Claude is curating your first list…');
    await fetch('/api/generate-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {});

    setGenStatus('Done — taking you in…');
    await new Promise(r => setTimeout(r, 700));
    router.push('/');
  }

  /* ══ STEP 5: Generating ════════════════════════════════════════════════ */
  if (step === 5) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${C.orange}, #c94a00)`,
            margin: '0 auto 1.75rem',
            boxShadow: `0 0 48px ${C.orange}55`,
            animation: 'orbFloat 2.5s ease-in-out infinite',
          }} />
          <h2 style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 36",
            fontSize: '1.9rem', fontWeight: 900, color: C.ink, marginBottom: '.5rem',
          }}>
            Building your curriculum
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '.9rem',
            color: C.muted, lineHeight: 1.7, marginBottom: '2rem',
          }}>
            {genStatus}
          </p>
          <div style={{ height: 4, background: C.rule, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: C.orange, borderRadius: 2,
              animation: 'progressFill 12s ease-out forwards',
            }} />
          </div>
          <style>{`
            @keyframes progressFill { 0% { width: 5%; } 60% { width: 75%; } 90% { width: 90%; } 100% { width: 96%; } }
            @keyframes orbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          `}</style>
        </div>
      </div>
    );
  }

  /* ══ SHARED WRAPPER ════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(2rem,6vw,4rem) 1.5rem' }}>

        {/* Logo */}
        <div style={{ marginBottom: '3rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 24",
            fontSize: '1.3rem', fontWeight: 900, color: C.ink,
          }}>
            stack<span style={{ color: C.orange }}>some</span>
          </span>
        </div>

        <Steps current={step} total={4} />

        {/* ══ STEP 1: What's on your mind? ══════════════════════════════ */}
        {step === 1 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 1 of 4 — Your mind
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
              fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900,
              color: C.ink, lineHeight: 1.08, marginBottom: '.85rem',
            }}>
              What's on<br />your mind?
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.95rem',
              color: C.muted, lineHeight: 1.7, marginBottom: '2rem',
            }}>
              Tell us anything — what you're building, what you're curious about, what keeps you up at night.
              The more honest, the better the curation.
            </p>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.trim() && !thinking) {
                  handleInterpret();
                }
              }}
              rows={5}
              placeholder={
                "Try anything:\n" +
                "\"I'm building a manufacturing startup and have no idea what I don't know\"\n" +
                "\"I work in finance but feel like I'm missing the bigger picture\"\n" +
                "\"I just want to read things that actually make me think\""
              }
              style={{
                width: '100%', fontFamily: 'var(--font-body)', fontSize: '.95rem',
                padding: '16px 18px', border: `2px solid ${input.trim() ? C.orange : C.rule}`,
                borderRadius: 12, outline: 'none', color: C.ink,
                lineHeight: 1.7, resize: 'none', background: C.soft,
                transition: 'border-color .2s', boxSizing: 'border-box',
                marginBottom: '1.25rem',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: C.muted }}>
                ⌘ + Enter to continue
              </span>
              <button
                onClick={handleInterpret}
                disabled={!input.trim() || thinking}
                style={{
                  padding: '13px 28px', borderRadius: 10,
                  background: input.trim() && !thinking ? C.orange : C.rule,
                  color: input.trim() && !thinking ? '#fff' : C.muted,
                  fontFamily: 'var(--font-body)', fontSize: '.95rem', fontWeight: 700,
                  border: 'none', cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
                  transition: 'all .2s',
                  boxShadow: input.trim() && !thinking ? `0 4px 20px ${C.orange}44` : 'none',
                  minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                {thinking ? (
                  <><ThinkingDots /> <span style={{ opacity: .7 }}>Reading you…</span></>
                ) : (
                  'Continue →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Topic tokens + sub-options ════════════════════════ */}
        {step === 2 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 2 of 4 — Your interests
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
              fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900,
              color: C.ink, lineHeight: 1.1, marginBottom: '.5rem',
            }}>
              Here's what we got
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.9rem',
              color: C.muted, lineHeight: 1.6, marginBottom: '2rem',
            }}>
              {summary} Tap a topic to pick the angles that matter most to you.
            </p>

            {/* Topic chips + inline sub-options */}
            <div style={{ marginBottom: '2rem' }}>
              {topics.map(topic => {
                const isOpen     = openTopics.has(topic);
                const opts       = subOptions[topic] || [];
                const topicSubs  = selectedSubs[topic] || new Set();
                const hasSelected = topicSubs.size > 0;

                return (
                  <div key={topic} style={{ marginBottom: '.5rem' }}>
                    {/* Chip */}
                    <button
                      onClick={() => toggleTopic(topic)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 24,
                        border: `1.5px solid ${isOpen || hasSelected ? C.orange : C.rule}`,
                        background: isOpen || hasSelected ? C.orangeLight : '#fff',
                        fontFamily: 'var(--font-body)', fontSize: '.88rem', fontWeight: 700,
                        color: isOpen || hasSelected ? C.orange : '#444',
                        cursor: 'pointer', transition: 'all .15s',
                      }}
                    >
                      {hasSelected && <span style={{ fontSize: '.7rem' }}>✓</span>}
                      {topic}
                      <span style={{
                        fontSize: '.65rem', opacity: .6,
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform .2s',
                        display: 'inline-block',
                      }}>▼</span>
                    </button>

                    {/* Sub-options — slide down when open */}
                    {isOpen && opts.length > 0 && (
                      <div style={{
                        marginTop: '.5rem',
                        padding: '1rem',
                        background: C.soft,
                        border: `1px solid ${C.rule}`,
                        borderRadius: 10,
                        display: 'flex', flexDirection: 'column', gap: '.4rem',
                        animation: 'slideDown .2s ease-out',
                      }}>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
                          letterSpacing: '.08em', textTransform: 'uppercase',
                          color: C.muted, marginBottom: '.25rem',
                        }}>
                          Which angles resonate?
                        </p>
                        {opts.map(phrase => {
                          const sel = topicSubs.has(phrase);
                          return (
                            <button
                              key={phrase}
                              onClick={() => toggleSub(topic, phrase)}
                              style={{
                                textAlign: 'left',
                                padding: '10px 14px', borderRadius: 8,
                                border: `1.5px solid ${sel ? C.orange : C.rule}`,
                                background: sel ? C.orangeLight : '#fff',
                                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                                fontWeight: sel ? 700 : 400,
                                color: sel ? C.orange : '#333',
                                cursor: 'pointer', transition: 'all .12s',
                                display: 'flex', alignItems: 'center', gap: 8,
                              }}
                            >
                              <span style={{ opacity: sel ? 1 : .25, fontSize: '.75rem' }}>
                                {sel ? '✓' : '○'}
                              </span>
                              {phrase}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => setStep(1)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '8px 14px', borderRadius: 24,
                  background: 'transparent', border: `1.5px dashed ${C.rule}`,
                  fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 500,
                  color: C.muted, cursor: 'pointer', marginTop: '.25rem',
                }}
              >
                ✏ Edit
              </button>
            </div>

            {/* Live profile preview */}
            <div style={{
              padding: '1rem 1.25rem', background: C.soft,
              border: `1px solid ${C.rule}`, borderRadius: 8, marginBottom: '2rem',
            }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
                letterSpacing: '.1em', textTransform: 'uppercase',
                color: C.muted, marginBottom: '.4rem',
              }}>
                What Claude sees when picking your posts
              </p>
              <p style={{
                fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 14",
                fontSize: '.82rem', fontStyle: 'italic', color: '#444', lineHeight: 1.7,
              }}>
                {buildEnrichedProfile()}
              </p>
            </div>

            <button
              onClick={handleConfirmTopics}
              style={{
                width: '100%', padding: '15px', borderRadius: 10,
                background: C.orange, color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                boxShadow: `0 4px 20px ${C.orange}44`,
                marginBottom: '.75rem',
              }}
            >
              Looks right — continue →
            </button>
            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: 'transparent', color: C.muted,
                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                border: `1.5px solid ${C.rule}`, cursor: 'pointer',
              }}
            >
              ← Let me reword that
            </button>
            <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }`}</style>
          </div>
        )}

        {/* ══ STEP 3: Test stacks ════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 3 of 4 — Your taste
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
              fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900,
              color: C.ink, lineHeight: 1.1, marginBottom: '.5rem',
            }}>
              Which of these<br />feels right?
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.9rem',
              color: C.muted, lineHeight: 1.6, marginBottom: '2rem',
            }}>
              Three sample reading lists built for your interests. Vote on what resonates — this shapes how Claude curates for you.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {stacksLoading
                ? [0, 1, 2].map(i => <StackSkeleton key={i} />)
                : stacks.map(stack => {
                    const vote = stackVotes[stack.id];
                    return (
                      <div key={stack.id} style={{
                        border: `1.5px solid ${
                          vote === 'up' ? C.orange :
                          vote === 'down' ? '#E8C5C5' :
                          C.rule
                        }`,
                        borderRadius: 12,
                        background: vote === 'up' ? C.orangeLight : vote === 'down' ? C.redLight : '#fff',
                        padding: '1.25rem',
                        transition: 'all .2s',
                      }}>
                        <p style={{
                          fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 18",
                          fontSize: '1.05rem', fontWeight: 800, color: C.ink,
                          marginBottom: '.25rem',
                        }}>
                          {stack.vibe}
                        </p>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '.78rem',
                          color: C.muted, marginBottom: '1rem', lineHeight: 1.5,
                        }}>
                          {stack.description}
                        </p>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                          {stack.posts.map((post, i) => (
                            <li key={i} style={{
                              fontFamily: 'var(--font-body)', fontSize: '.84rem',
                              color: '#333', lineHeight: 1.45,
                              paddingLeft: '1.1rem', position: 'relative',
                            }}>
                              <span style={{ position: 'absolute', left: 0, color: C.orange, fontWeight: 700 }}>·</span>
                              {post}
                            </li>
                          ))}
                        </ul>

                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button
                            onClick={() => voteStack(stack.id, 'up')}
                            style={{
                              flex: 1, padding: '9px', borderRadius: 8,
                              border: `1.5px solid ${vote === 'up' ? C.orange : C.rule}`,
                              background: vote === 'up' ? C.orange : 'transparent',
                              color: vote === 'up' ? '#fff' : C.muted,
                              fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 700,
                              cursor: 'pointer', transition: 'all .15s',
                            }}
                          >
                            👍 Yes, this
                          </button>
                          <button
                            onClick={() => voteStack(stack.id, 'down')}
                            style={{
                              flex: 1, padding: '9px', borderRadius: 8,
                              border: `1.5px solid ${vote === 'down' ? '#E53E3E' : C.rule}`,
                              background: vote === 'down' ? '#E53E3E' : 'transparent',
                              color: vote === 'down' ? '#fff' : C.muted,
                              fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 700,
                              cursor: 'pointer', transition: 'all .15s',
                            }}
                          >
                            👎 Not really
                          </button>
                        </div>
                      </div>
                    );
                  })
              }
            </div>

            {!stacksLoading && Object.keys(stackVotes).length === 0 && (
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.78rem',
                color: C.muted, textAlign: 'center', marginBottom: '1.25rem',
              }}>
                Vote on at least one to continue
              </p>
            )}

            <button
              onClick={handleConfirmStacks}
              disabled={stacksLoading || Object.keys(stackVotes).length === 0}
              style={{
                width: '100%', padding: '15px', borderRadius: 10,
                background: Object.keys(stackVotes).length > 0 ? C.orange : C.rule,
                color: Object.keys(stackVotes).length > 0 ? '#fff' : C.muted,
                fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
                border: 'none',
                cursor: Object.keys(stackVotes).length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: Object.keys(stackVotes).length > 0 ? `0 4px 20px ${C.orange}44` : 'none',
                marginBottom: '.75rem',
                transition: 'all .2s',
              }}
            >
              Continue →
            </button>
            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: 'transparent', color: C.muted,
                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                border: `1.5px solid ${C.rule}`, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ══ STEP 4: Publications ══════════════════════════════════════ */}
        {step === 4 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 4 of 4 — Publications
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
              fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900,
              color: C.ink, lineHeight: 1.1, marginBottom: '.75rem',
            }}>
              Any Substacks<br />you already follow?
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.95rem',
              color: C.muted, lineHeight: 1.7, marginBottom: '2rem',
            }}>
              These become your personal stack — Stacksome surfaces the best posts from them weekly.{' '}
              <strong style={{ color: C.ink }}>Totally optional.</strong> We'll discover great reads regardless.
            </p>

            <form onSubmit={handleAddPub} style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem' }}>
              <input
                value={pubInput} onChange={e => setPubInput(e.target.value)}
                placeholder="e.g. lenny.substack.com"
                style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: '.88rem',
                  padding: '12px 14px', border: `1.5px solid ${C.rule}`,
                  borderRadius: 8, outline: 'none', color: C.ink, background: C.soft,
                }}
              />
              <button
                type="submit"
                disabled={pubLoading || !pubInput.trim()}
                style={{
                  padding: '12px 20px', borderRadius: 8,
                  background: C.ink, color: '#fff',
                  fontFamily: 'var(--font-body)', fontSize: '.85rem', fontWeight: 700,
                  border: 'none',
                  cursor: pubLoading || !pubInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: pubLoading || !pubInput.trim() ? .5 : 1,
                  flexShrink: 0,
                }}
              >
                {pubLoading ? '…' : 'Add'}
              </button>
            </form>

            {publications.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {publications.map(p => (
                  <div key={p.id || p.url} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '.65rem .9rem', marginBottom: '.4rem',
                    background: '#F4FFF7', border: '1.5px solid #C8EDD3', borderRadius: 8,
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '.88rem', fontWeight: 600, color: '#1a6e3a' }}>
                      ✓ {p.name || p.url}
                    </span>
                    <button onClick={() => removePub(p.id, p.name)} style={{
                      background: 'none', border: 'none', color: C.muted,
                      cursor: 'pointer', fontSize: '.8rem',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {suggestedPubs.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase',
                  color: C.muted, marginBottom: '.75rem',
                }}>
                  Suggested based on your interests
                </p>
                {suggestedPubs.map(pub => {
                  const already  = trackedUrls.some(u => u.includes(pub.url.replace(/^https?:\/\//, '')));
                  const isAdding = addingUrl === pub.url;
                  return (
                    <div key={pub.url} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '.75rem 1rem', marginBottom: '.4rem',
                      border: `1.5px solid ${already ? '#C8EDD3' : C.rule}`,
                      background: already ? '#F4FFF7' : '#fff',
                      borderRadius: 8, gap: '1rem',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.88rem', fontWeight: 700, color: C.ink, margin: 0 }}>
                          {pub.name}
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.76rem', color: C.muted, margin: '2px 0 0' }}>
                          {pub.desc}
                        </p>
                      </div>
                      {already ? (
                        <span style={{ fontSize: '.78rem', color: '#1a6e3a', fontWeight: 700, flexShrink: 0 }}>Added ✓</span>
                      ) : (
                        <button
                          onClick={() => handleAddPub(null, pub.url)}
                          disabled={isAdding}
                          style={{
                            padding: '7px 16px', borderRadius: 6,
                            border: `1.5px solid ${C.orange}`,
                            background: 'transparent', color: C.orange,
                            fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 700,
                            cursor: isAdding ? 'not-allowed' : 'pointer',
                            opacity: isAdding ? .5 : 1, flexShrink: 0,
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

            <button
              onClick={handleGenerate}
              style={{
                width: '100%', padding: '15px', borderRadius: 10,
                background: C.orange, color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                boxShadow: `0 4px 20px ${C.orange}44`,
                marginBottom: '.75rem',
              }}
            >
              {publications.length > 0 ? 'Build my list →' : 'Skip — build my list →'}
            </button>
            <button
              onClick={() => setStep(3)}
              style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: 'transparent', color: C.muted,
                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                border: `1.5px solid ${C.rule}`, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
