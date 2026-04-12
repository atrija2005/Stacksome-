import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '../components/Toast';

const C = {
  orange: '#FF6719', orangeLight: '#FFF3EC',
  ink: '#0a0a0a', muted: '#777', rule: '#E8E6E2', soft: '#FAFAF8',
};

/* ── Thinking dots animation ──────────────────────────────────────────────── */
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

/* ── Progress dots ────────────────────────────────────────────────────────── */
function Steps({ current, total = 3 }) {
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

/* ── Resonance card — "does this resonate?" ───────────────────────────────── */
function PromptCard({ text, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '14px 18px', borderRadius: 10,
        border: `1.5px solid ${selected ? C.orange : C.rule}`,
        background: selected ? C.orangeLight : '#fff',
        fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 18",
        fontSize: 'clamp(.88rem, 2vw, .98rem)', fontWeight: selected ? 700 : 500,
        color: selected ? C.orange : '#333',
        cursor: 'pointer', transition: 'all .15s',
        lineHeight: 1.4,
        boxShadow: selected ? `0 0 0 1px ${C.orange}` : 'none',
      }}
    >
      <span style={{ marginRight: 8, opacity: selected ? 1 : .3 }}>
        {selected ? '✓' : '○'}
      </span>
      {text}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Setup() {
  const router = useRouter();
  const toast  = useToast();
  const textareaRef = useRef(null);

  /* ── State ────────────────────────────────────────────────────────────── */
  const [step,        setStep]       = useState(1);
  const [input,       setInput]      = useState('');
  const [thinking,    setThinking]   = useState(false);

  // Claude's interpretation
  const [profile,     setProfile]    = useState('');
  const [topics,      setTopics]     = useState([]);
  const [prompts,     setPrompts]    = useState([]);
  const [summary,     setSummary]    = useState('');
  const [selected,    setSelected]   = useState(new Set());

  // Publications
  const [pubInput,    setPubInput]   = useState('');
  const [pubLoading,  setPubLoading] = useState(false);
  const [publications, setPublications] = useState([]);
  const [suggestions,  setSuggestions]  = useState([]);
  const [addingUrl,    setAddingUrl]    = useState(null);

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

  /* ── Step 1 → 2: Claude interprets input ─────────────────────────────── */
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
      setPrompts(data.prompts || []);
      setSummary(data.summary || '');
      setSelected(new Set()); // reset selections
      setStep(2);
    } catch {
      toast('Something went wrong — try again', 'error');
    } finally {
      setThinking(false);
    }
  }

  /* ── Toggle a resonance prompt ────────────────────────────────────────── */
  function togglePrompt(text) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(text) ? next.delete(text) : next.add(text);
      return next;
    });
  }

  /* ── Remove a topic chip ──────────────────────────────────────────────── */
  function removeTopic(t) {
    setTopics(prev => prev.filter(x => x !== t));
  }

  /* ── Step 2 → 3: confirm profile ─────────────────────────────────────── */
  function handleConfirm() {
    // Enrich profile with selected resonance signals
    const enriched = selected.size > 0
      ? `${profile} Specifically resonates with: ${[...selected].join('; ')}.`
      : profile;
    setProfile(enriched);
    setStep(3);
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

  // Suggested pubs that match selected topics
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
    setStep(4);
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

  /* ════════════════════════════════════════════════════════════════════════
      STEP 4 — Generating screen
  ════════════════════════════════════════════════════════════════════════ */
  if (step === 4) {
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
          `}</style>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
      SHARED WRAPPER
  ════════════════════════════════════════════════════════════════════════ */
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

        <Steps current={step} total={3} />

        {/* ══ STEP 1: What's on your mind? ══════════════════════════════════ */}
        {step === 1 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 1 of 3 — Your mind
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

        {/* ══ STEP 2: Confirm + resonance ═══════════════════════════════════ */}
        {step === 2 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 2 of 3 — Confirm
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
              fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900,
              color: C.ink, lineHeight: 1.1, marginBottom: '.75rem',
            }}>
              Here's what we understood
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.9rem',
              color: C.muted, lineHeight: 1.6, marginBottom: '2rem',
            }}>
              {summary}
            </p>

            {/* Topic tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '2rem' }}>
              {topics.map(t => (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20,
                  background: C.orangeLight, border: `1.5px solid ${C.orange}`,
                  fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 700,
                  color: C.orange,
                }}>
                  {t}
                  <button
                    onClick={() => removeTopic(t)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: C.orange, cursor: 'pointer', fontSize: '.7rem',
                      lineHeight: 1, marginLeft: 2,
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                onClick={() => setStep(1)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 20,
                  background: 'transparent', border: `1.5px dashed ${C.rule}`,
                  fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 500,
                  color: C.muted, cursor: 'pointer',
                }}
              >
                ✏ Edit
              </button>
            </div>

            {/* Resonance prompts */}
            <div style={{ marginBottom: '2.5rem' }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.8rem', fontWeight: 700,
                color: C.ink, marginBottom: '.35rem',
              }}>
                Tap anything that resonates
              </p>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '.78rem',
                color: C.muted, marginBottom: '1rem', lineHeight: 1.5,
              }}>
                This tells us exactly how deep to go. Skip it if you'd rather be surprised.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {prompts.map(p => (
                  <PromptCard
                    key={p} text={p}
                    selected={selected.has(p)}
                    onClick={() => togglePrompt(p)}
                  />
                ))}
              </div>
            </div>

            {/* What Claude will see */}
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
                {selected.size > 0
                  ? `${profile} Specifically resonates with: ${[...selected].join('; ')}.`
                  : profile
                }
              </p>
            </div>

            <button
              onClick={handleConfirm}
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
          </div>
        )}

        {/* ══ STEP 3: Publications ══════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '1rem',
            }}>
              Step 3 of 3 — Publications
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

            {/* URL input */}
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

            {/* Added pubs */}
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

            {/* Smart suggestions */}
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

            {/* CTAs */}
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
              {publications.length > 0
                ? `Build my list →`
                : 'Skip — build my list →'}
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
      </div>
    </div>
  );
}
