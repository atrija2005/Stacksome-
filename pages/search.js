import { useState, useRef, useEffect, useCallback } from 'react';
// search.js — Stacksome global article search
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const C = {
  orange: '#FF6719', orangeLight: '#FFF3EC', orangeBorder: '#FFD4B8',
  ink: '#0a0a0a', muted: '#777', rule: '#E8E6E2', soft: '#FAFAF8',
};

const SUGGESTIONS = [
  'manufacturing', 'supply chain', 'founder', 'venture capital',
  'semiconductor', 'AI regulation', 'industrial policy', 'interest rates',
  'geopolitics', 'deep tech', 'bootstrapping', 'systems thinking',
];

const PAGE_SIZE = 6; // 6 shown initially — "Show more" appears for most queries

/* ── Single result card ──────────────────────────────────────────────────── */
function ResultCard({ result, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', textDecoration: 'none',
        padding: '1.1rem 1.4rem',
        border: `1.5px solid ${hovered ? C.orange : C.rule}`,
        borderLeft: `4px solid ${hovered ? C.orange : C.rule}`,
        borderRadius: 10, marginBottom: '.6rem',
        background: hovered ? C.orangeLight : '#fff',
        transition: 'all .15s',
        animation: 'fadeSlideUp .3s ease both',
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 600, color: hovered ? C.orange : '#999', transition: 'color .15s' }}>
          {result.publication}
        </span>
        {result.topic && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '.6rem', fontWeight: 700,
            letterSpacing: '.08em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 3,
            background: hovered ? C.orange : C.soft,
            color: hovered ? '#fff' : C.muted,
            border: `1px solid ${hovered ? C.orange : C.rule}`,
            transition: 'all .15s', flexShrink: 0,
          }}>
            {result.topic}
          </span>
        )}
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 18",
        fontSize: 'clamp(.92rem, 2.2vw, 1.05rem)', fontWeight: 700,
        color: C.ink, lineHeight: 1.35,
        marginBottom: result.description ? '.4rem' : (result.reason ? '.3rem' : 0),
      }}>
        {result.title}
      </h3>

      {result.description && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '.8rem',
          color: hovered ? '#444' : '#666', lineHeight: 1.55,
          marginBottom: result.reason ? '.35rem' : 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {result.description}
        </p>
      )}

      {result.reason && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '.72rem',
          color: hovered ? C.orange : '#aaa', lineHeight: 1.4,
          display: 'flex', alignItems: 'center', gap: 4,
          fontStyle: 'italic', margin: 0,
        }}>
          <span style={{ color: C.orange, fontWeight: 700, fontStyle: 'normal' }}>›</span>
          {result.reason}
        </p>
      )}
    </a>
  );
}

/* ── By-publication accordion (shown when expanded) ─────────────────────── */
function PubAccordion({ results }) {
  const [open, setOpen] = useState({});

  const byPub = {};
  for (const r of results) {
    if (!byPub[r.publication]) byPub[r.publication] = [];
    byPub[r.publication].push(r);
  }
  const pubs = Object.entries(byPub);
  if (pubs.length < 2) return null;

  return (
    <div style={{ marginTop: '2rem', borderTop: `1px solid ${C.rule}`, paddingTop: '1.5rem' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
        letterSpacing: '.1em', textTransform: 'uppercase',
        color: C.muted, marginBottom: '1rem',
      }}>
        Browse by publication
      </p>
      {pubs.map(([pubName, arts]) => {
        const isOpen = !!open[pubName];
        return (
          <div key={pubName} style={{ marginBottom: '.5rem' }}>
            <button
              onClick={() => setOpen(o => ({ ...o, [pubName]: !o[pubName] }))}
              style={{
                width: '100%', padding: '.65rem 1rem',
                border: `1.5px solid ${isOpen ? C.orange : C.rule}`,
                borderRadius: isOpen ? '8px 8px 0 0' : 8,
                background: isOpen ? C.orangeLight : C.soft,
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all .15s',
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 600, color: isOpen ? C.orange : C.ink }}>
                {pubName}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: C.muted }}>
                  {arts.length} article{arts.length !== 1 ? 's' : ''}
                </span>
                <span style={{
                  color: isOpen ? C.orange : C.muted, fontSize: '.85rem',
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s',
                }}>▾</span>
              </span>
            </button>
            {isOpen && (
              <div style={{ border: `1.5px solid ${C.orange}`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                {arts.map((r, i) => (
                  <a
                    key={r.url || i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block', textDecoration: 'none',
                      padding: '.75rem 1rem',
                      borderTop: i > 0 ? `1px solid ${C.rule}` : 'none',
                      background: '#fff', transition: 'background .12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.orangeLight; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '.88rem', fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.35 }}>
                      {r.title}
                    </p>
                    {r.description && (
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '.74rem', color: '#888',
                        margin: '.25rem 0 0', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {r.description}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main search page ────────────────────────────────────────────────────── */
export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef(null);

  const [query,         setQuery]        = useState('');
  const [results,       setResults]      = useState(null);
  const [suggestedPubs, setSuggestedPubs] = useState([]);
  const [loading,       setLoading]      = useState(false);
  const [searched,      setSearched]     = useState('');
  const [message,       setMessage]      = useState('');
  const [addingUrl,     setAddingUrl]    = useState(null);
  const [visibleCount,  setVisibleCount] = useState(PAGE_SIZE);

  // On initial load only — pick up ?q= from URL
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.q;
    if (q && !searched) {
      setQuery(q);
      doSearch(q);
    }
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const doSearch = useCallback(async (term) => {
    if (!term || !term.trim()) return;
    const t = term.trim();
    setLoading(true);
    setResults(null);
    setMessage('');
    setSearched(t);
    setVisibleCount(PAGE_SIZE);

    // Shallow URL update — effect guard (if q && !searched) prevents re-firing
    router.replace(`/search?q=${encodeURIComponent(t)}`, undefined, { shallow: true });

    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(t)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSuggestedPubs(data.suggestedPubs || []);
      setMessage(data.message || '');
    } catch {
      setMessage('Search failed — please try again.');
      setResults([]);
      setSuggestedPubs([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  function handleKey(e) {
    if (e.key === 'Enter' && query.trim()) doSearch(query);
  }

  function handleClear() {
    setQuery('');
    setResults(null);
    setSearched('');
    setVisibleCount(PAGE_SIZE);
    router.replace('/search', undefined, { shallow: true });
    inputRef.current?.focus();
  }

  const visible = results ? results.slice(0, visibleCount) : [];
  const remaining = results ? results.length - visibleCount : 0;

  return (
    <Layout>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: scale(1); opacity: .9; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        .search-input:focus { border-color: ${C.orange} !important; box-shadow: 0 0 0 3px ${C.orange}22 !important; }
        .chip-btn:hover { background: ${C.orangeLight} !important; border-color: ${C.orange} !important; color: ${C.orange} !important; }
      `}</style>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
            fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 900,
            color: C.ink, lineHeight: 1.08, marginBottom: '.4rem',
          }}>
            Search
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', color: C.muted }}>
            Find the best articles on any topic across Stacksome's curated publications.
          </p>
        </div>

        {/* ── Search bar ── */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{
            position: 'absolute', left: '1rem', top: '50%',
            transform: 'translateY(-50%)', fontSize: '1.1rem',
            pointerEvents: 'none', opacity: .4,
          }}>🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Try "manufacturing", "founder", "interest rates"...'
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              padding: '15px 110px 15px 2.75rem',
              border: `2px solid ${C.rule}`, borderRadius: 12,
              outline: 'none', color: C.ink, background: '#fff',
              transition: 'border-color .2s, box-shadow .2s',
            }}
          />
          <button
            onClick={() => doSearch(query)}
            disabled={!query.trim() || loading}
            style={{
              position: 'absolute', right: '.5rem', top: '50%',
              transform: 'translateY(-50%)',
              padding: '9px 20px', borderRadius: 8,
              background: query.trim() && !loading ? C.orange : C.rule,
              color: query.trim() && !loading ? '#fff' : C.muted,
              fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 700,
              border: 'none', cursor: query.trim() && !loading ? 'pointer' : 'default',
              transition: 'all .15s',
            }}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* ── Suggestion chips (before any search) ── */}
        {results === null && !loading && (
          <div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.1em', textTransform: 'uppercase',
              color: C.muted, marginBottom: '.75rem',
            }}>
              Try searching for
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="chip-btn"
                  onClick={() => { setQuery(s); doSearch(s); }}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 500,
                    padding: '7px 14px', borderRadius: 20,
                    border: `1.5px solid ${C.rule}`,
                    background: C.soft, color: C.muted,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading spinner ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${C.orange}, #c94a00)`,
              margin: '0 auto 1rem', boxShadow: `0 0 24px ${C.orange}55`,
              animation: 'orbFloat 1.8s ease-in-out infinite',
            }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', color: C.muted }}>
              Finding articles on <strong style={{ color: C.ink }}>"{searched}"</strong>…
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {!loading && results !== null && (
          <div style={{ marginTop: '1.5rem' }}>
            {results.length > 0 ? (
              <>
                {/* Count + clear */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.5rem',
                }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', color: C.muted }}>
                    <strong style={{ color: C.ink }}>{results.length}</strong> result{results.length !== 1 ? 's' : ''} for{' '}
                    <strong style={{ color: C.orange }}>"{searched}"</strong>
                  </p>
                  <button
                    onClick={handleClear}
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: '.75rem',
                      color: C.muted, background: 'none', border: 'none',
                      cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Clear
                  </button>
                </div>

                {/* Result cards */}
                {visible.map((r, i) => (
                  <ResultCard key={r.url || i} result={r} index={i} />
                ))}

                {/* Show more / collapse */}
                {results.length > PAGE_SIZE && (
                  <div style={{ marginTop: '.5rem' }}>
                    {remaining > 0 ? (
                      <button
                        onClick={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, results.length))}
                        style={{
                          width: '100%', padding: '12px',
                          border: `1.5px dashed ${C.rule}`, borderRadius: 10,
                          background: 'transparent', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: '.82rem',
                          fontWeight: 600, color: C.muted, transition: 'all .15s',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '.5rem',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = C.orange;
                          e.currentTarget.style.color = C.orange;
                          e.currentTarget.style.background = C.orangeLight;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = C.rule;
                          e.currentTarget.style.color = C.muted;
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>↓</span>
                        Show {Math.min(PAGE_SIZE, remaining)} more
                        <span style={{ fontWeight: 400, fontSize: '.74rem', color: '#bbb' }}>
                          ({remaining} remaining)
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setVisibleCount(PAGE_SIZE)}
                        style={{
                          width: '100%', padding: '11px',
                          border: `1.5px dashed ${C.rule}`, borderRadius: 10,
                          background: 'transparent', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: '.78rem',
                          fontWeight: 500, color: '#bbb', transition: 'all .15s',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '.4rem',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.muted; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; }}
                      >
                        <span>↑</span> Collapse
                      </button>
                    )}
                  </div>
                )}

                {/* By-publication accordion — shown only when fully expanded */}
                {remaining === 0 && results.length > PAGE_SIZE && (
                  <PubAccordion results={results} />
                )}
              </>
            ) : (
              /* ── Empty state ── */
              <div style={{ padding: '2rem 0' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '.95rem', color: C.ink, fontWeight: 600, marginBottom: '.4rem' }}>
                  No articles found for "{searched}"
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', color: C.muted, marginBottom: '1.75rem', lineHeight: 1.6 }}>
                  {message || 'Try a broader term — "manufacturing", "AI", "investing", "founder".'}
                </p>

                {suggestedPubs.length > 0 && (
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
                      letterSpacing: '.1em', textTransform: 'uppercase',
                      color: C.muted, marginBottom: '.75rem',
                    }}>
                      Publications on "{searched}"
                    </p>
                    {suggestedPubs.map(pub => (
                      <div key={pub.url} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '.85rem 1rem', marginBottom: '.5rem',
                        border: `1.5px solid ${C.rule}`, borderRadius: 8,
                        background: '#fff', gap: '1rem',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700, color: C.ink, margin: 0 }}>
                            {pub.name}
                          </p>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '.74rem', color: C.muted, margin: '2px 0 0' }}>
                            {pub.tags?.join(' · ')}
                          </p>
                        </div>
                        <button
                          disabled={addingUrl === pub.url}
                          onClick={async () => {
                            setAddingUrl(pub.url);
                            try {
                              const r = await fetch('/api/publications', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: pub.url }),
                              });
                              const d = await r.json();
                              if (!d.error) setSuggestedPubs(prev => prev.filter(p => p.url !== pub.url));
                            } finally { setAddingUrl(null); }
                          }}
                          style={{
                            padding: '7px 16px', borderRadius: 6,
                            border: `1.5px solid ${C.orange}`,
                            background: 'transparent', color: C.orange,
                            fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 700,
                            cursor: addingUrl === pub.url ? 'default' : 'pointer',
                            opacity: addingUrl === pub.url ? .5 : 1, flexShrink: 0,
                          }}
                        >
                          {addingUrl === pub.url ? '…' : '+ Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Powered by At&At ── */}
        <div style={{
          marginTop: '3rem', paddingTop: '1.25rem',
          borderTop: `1px solid ${C.rule}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
        }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.7rem', color: '#ccc' }}>Search powered by</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700, color: '#bbb' }}>At&amp;At</span>
        </div>

      </div>
    </Layout>
  );
}
