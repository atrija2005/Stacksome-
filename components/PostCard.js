import { useState, useRef, useEffect } from 'react';
import { useToast } from './Toast';

const ANGLE_STYLES = {
  'Overview':       { accent: '#0050c8', accentBg: '#EEF3FF' },
  'Business Model': { accent: '#047857', accentBg: '#ECFDF5' },
  'Key Players':    { accent: '#7C3AED', accentBg: '#F5F3FF' },
  'Bear Case':      { accent: '#DC2626', accentBg: '#FEF2F2' },
  'Consensus':      { accent: '#374151', accentBg: '#F9FAFB' },
  'Contrarian':     { accent: '#FF6719', accentBg: '#FFF3EC' },
  'Edge':           { accent: '#0891B2', accentBg: '#ECFEFF' },
};

const SECTION_STYLES = {
  discover: { accent: '#FF6719', accentBg: '#FFF3EC', label: 'Fresh Pick' },
  stack:    { accent: '#0050c8', accentBg: '#EEF3FF', label: 'Your Stack' },
  core:     { accent: '#FF6719', accentBg: '#FFF3EC', label: 'Curated'   },
};

const REFINE_MILESTONES = new Set([5, 10, 20, 35]);

// ── Passive behaviour tracking ────────────────────────────────────────────
// Writes to localStorage so it survives across sessions and can inform
// future list generation and keep-or-swap suggestions.
function trackFeedEvent(postUrl, pubName, eventType, extra = {}) {
  try {
    const key = 'ss_feed_behavior';
    const events = JSON.parse(localStorage.getItem(key) || '[]');
    events.push({ postUrl, pubName, eventType, t: Date.now(), ...extra });
    // Keep last 200 events, trimmed from the front
    localStorage.setItem(key, JSON.stringify(events.slice(-200)));
  } catch { /* silent — never crash for analytics */ }
}

function truncate(s, n) {
  if (!s) return '';
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > n ? c.slice(0, n).replace(/\s\S*$/, '') + '…' : c;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function PostCard({ post, index, weekLabel, initialSignals = {}, readOnly = false, animDelay = 0, onSignal }) {
  const toast   = useToast();
  const [signals, setSignals] = useState(initialSignals[post.url] || {});
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tldrOpen, setTldrOpen] = useState(false);
  const [showDownReason, setShowDownReason] = useState(false);

  // ── Dwell-time tracking ───────────────────────────────────────────────
  const hoverStartRef = useRef(null);
  const dwellFiredRef = useRef(false); // only fire once per card mount

  const pubName = post.publication_name || post.publication || '';

  function handleMouseEnter() {
    setHovered(true);
    hoverStartRef.current = Date.now();
  }

  function handleMouseLeave() {
    setHovered(false);
    if (hoverStartRef.current) {
      const duration = Date.now() - hoverStartRef.current;
      hoverStartRef.current = null;
      // 4 s+ dwell on a card = genuine interest
      if (duration >= 4000 && !dwellFiredRef.current) {
        dwellFiredRef.current = true;
        trackFeedEvent(post.url, pubName, 'dwell', { durationMs: duration });
      }
    }
  }

  const s      = (post.angle && ANGLE_STYLES[post.angle]) || SECTION_STYLES[post.section] || SECTION_STYLES[post.type] || SECTION_STYLES.discover;
  const isRead = !!signals.read;
  const excerpt = truncate(post.description, 180);
  const date    = formatDate(post.published_at);

  async function sendSignal(sig) {
    if (readOnly || loading) return;
    setShowDownReason(false);
    setLoading(true);
    try {
      const res = await fetch('/api/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl: post.url, signal: sig, weekLabel }),
      });
      const data = await res.json();
      setSignals(prev => {
        const n = { ...prev };
        const baseSignal = sig.split(':')[0];
        if (baseSignal === 'up' || baseSignal === 'down') { delete n.up; delete n.down; delete n['down:off-topic']; delete n['down:too-basic']; delete n['down:know-it']; }
        n[sig] = true;
        if (onSignal) onSignal(post.url, n);
        return n;
      });
      if (sig === 'up' && data.upCount && REFINE_MILESTONES.has(data.upCount)) {
        toast(`${data.upCount} upvotes — refining your profile…`, 'info');
        autoRefine(data.upCount);
      }
    } finally { setLoading(false); }
  }

  async function autoRefine(count) {
    try {
      const r = await fetch('/api/refine-profile', { method: 'POST' });
      const d = await r.json();
      if (d.success) toast(d.fallback ? 'Profile updated' : `Profile refined · ${count} upvotes analysed`, 'success');
    } catch { /* silent */ }
  }

  function handleTldrToggle() {
    const opening = !tldrOpen;
    setTldrOpen(opening);
    if (opening) {
      // Expanding the TL;DR = strong interest signal
      trackFeedEvent(post.url, pubName, 'expand');
    }
  }

  function handleTitleClick() {
    trackFeedEvent(post.url, pubName, 'click');
    if (!isRead) sendSignal('read');
  }

  return (
    <article
      className="anim-fade-in-up"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr',
        gap: 0,
        borderRadius: 14,
        marginBottom: '1.1rem',
        background: isRead ? '#F9F8F7' : '#fff',
        border: `1px solid ${hovered && !isRead ? '#d4cfc9' : '#ECEAE6'}`,
        boxShadow: hovered && !isRead
          ? `0 12px 40px rgba(0,0,0,.09), 0 2px 8px rgba(0,0,0,.04), -3px 0 0 ${s.accent}`
          : `-3px 0 0 ${isRead ? '#D5D2CE' : s.accent}, 0 2px 8px rgba(0,0,0,.03)`,
        opacity: isRead ? .6 : 1,
        transition: 'box-shadow .22s ease, border-color .15s ease, opacity .2s, transform .22s ease',
        transform: hovered && !isRead ? 'translateY(-3px)' : 'none',
        animationDelay: `${animDelay}ms`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Left number column ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '1.4rem',
        background: isRead ? 'transparent' : hovered ? s.accentBg : 'transparent',
        transition: 'background .22s ease',
        borderRight: `1px solid ${isRead ? '#ECEAE6' : hovered ? s.accent + '33' : '#ECEAE6'}`,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: "'opsz' 72",
          fontSize: '1.15rem',
          fontWeight: 900,
          color: isRead ? '#ccc' : hovered ? s.accent : '#D4D0CB',
          lineHeight: 1,
          transition: 'color .22s ease',
          letterSpacing: '-.03em',
        }}>
          {String(index).padStart(2, '0')}
        </span>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '1.25rem 1.4rem 1.1rem', minWidth: 0 }}>

        {/* Top meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.65rem', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '.6rem', fontWeight: 800,
            letterSpacing: '.1em', textTransform: 'uppercase',
            padding: '3px 9px', borderRadius: 4,
            background: isRead ? '#E8E6E2' : s.accent,
            color: isRead ? '#999' : '#fff',
            flexShrink: 0,
          }}>
            {post.angle || s.label || 'Curated'}
          </span>

          {pubName && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 700,
              color: isRead ? '#bbb' : '#333',
              flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 200,
            }}>
              {pubName}
            </span>
          )}

          {post.topic && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.63rem', fontWeight: 600,
              letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 3,
              background: '#F4F3F0', color: '#888',
              border: '1px solid #E8E6E2',
              flexShrink: 0,
            }}>
              {post.topic}
            </span>
          )}

          {date && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem',
              color: '#bbb', marginLeft: 'auto', flexShrink: 0,
            }}>
              {date}
            </span>
          )}
        </div>

        {/* Title */}
        <a
          href={post.url} target="_blank" rel="noopener noreferrer"
          onClick={handleTitleClick}
          style={{
            display: 'block', marginBottom: excerpt ? '.5rem' : '.7rem',
            fontFamily: 'var(--font-display)',
            fontVariationSettings: `'opsz' ${hovered ? '24' : '18'}`,
            fontSize: 'clamp(1.05rem, 2.4vw, 1.22rem)',
            fontWeight: 800,
            lineHeight: 1.28,
            color: isRead ? '#AAA' : hovered ? s.accent : '#0D0D0D',
            textDecoration: 'none',
            transition: 'color .18s ease',
            letterSpacing: '-.01em',
          }}
        >
          {post.title}
        </a>

        {/* TL;DR — expandable quick take, tracked as 'expand' */}
        {post.tldr && (
          <div style={{ marginBottom: '.6rem' }}>
            <button
              onClick={handleTldrToggle}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.3rem',
                fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
                letterSpacing: '.08em', textTransform: 'uppercase',
                color: tldrOpen ? s.accent : '#aaa',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 0 .4rem',
                transition: 'color .15s',
              }}
            >
              <span style={{
                display: 'inline-block',
                transform: tldrOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform .18s ease',
                fontSize: '.6rem',
              }}>▶</span>
              Quick take
            </button>
            {tldrOpen && (
              <div style={{
                padding: '.65rem .9rem',
                background: isRead ? '#F7F6F4' : s.accentBg,
                borderRadius: 8,
                borderLeft: `2px solid ${isRead ? '#DDD' : s.accent}`,
                animation: 'fadeInUp .2s ease both',
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.82rem',
                  color: isRead ? '#bbb' : '#444',
                  lineHeight: 1.7, margin: 0,
                }}>
                  {post.tldr}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Excerpt */}
        {excerpt && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '.83rem',
            color: isRead ? '#bbb' : '#666',
            lineHeight: 1.72, marginBottom: '.75rem',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {excerpt}
          </p>
        )}

        {/* Why — pull quote style */}
        {post.why && (
          <div style={{
            display: 'flex', gap: '.55rem', alignItems: 'flex-start',
            marginBottom: '1rem',
            padding: '.6rem .8rem',
            background: isRead ? '#F7F6F4' : hovered ? s.accentBg : '#FAFAF8',
            borderLeft: `2.5px solid ${isRead ? '#DDD' : s.accent}`,
            borderRadius: '0 6px 6px 0',
            transition: 'background .22s ease',
          }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.06em', textTransform: 'uppercase',
              color: isRead ? '#ccc' : s.accent, flexShrink: 0, marginTop: 1,
            }}>
              Why
            </span>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: "'opsz' 14",
              fontSize: '.82rem', fontStyle: 'italic',
              color: isRead ? '#bbb' : '#444', lineHeight: 1.65, margin: 0,
            }}>
              {post.why}
            </p>
          </div>
        )}

        {/* Actions */}
        {!readOnly && (
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => sendSignal('read')}
              disabled={loading}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
                letterSpacing: '.08em', textTransform: 'uppercase',
                padding: '5px 13px', borderRadius: 20,
                border: `1.5px solid ${isRead ? '#555' : '#DDD'}`,
                color: isRead ? '#fff' : '#888',
                background: isRead ? '#555' : 'transparent',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all .15s', flexShrink: 0,
              }}
            >
              {isRead ? '✓ Read' : 'Mark read'}
            </button>

            <button
              onClick={() => sendSignal('up')}
              disabled={loading}
              title="Worth it"
              style={{
                padding: '5px 12px', borderRadius: 20,
                border: `1.5px solid ${signals.up ? s.accent : '#DDD'}`,
                color: signals.up ? s.accent : '#bbb',
                background: signals.up ? s.accentBg : 'transparent',
                fontWeight: signals.up ? 700 : 400,
                fontSize: '.82rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all .15s',
              }}
            >
              ▲
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (loading) return;
                  const hasDown = signals.down || signals['down:off-topic'] || signals['down:too-basic'] || signals['down:know-it'];
                  if (hasDown) { sendSignal('down'); return; }
                  setShowDownReason(r => !r);
                }}
                disabled={loading}
                title="Not for me"
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: `1.5px solid ${showDownReason ? '#999' : '#DDD'}`,
                  color: showDownReason ? '#666' : '#bbb',
                  background: (signals.down || signals['down:off-topic'] || signals['down:too-basic'] || signals['down:know-it']) ? '#F4F3F0' : 'transparent',
                  opacity: (signals.down || signals['down:off-topic'] || signals['down:too-basic'] || signals['down:know-it']) ? 1 : .5,
                  fontSize: '.82rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                ▼
              </button>

              {showDownReason && (
                <>
                  {[
                    { sig: 'down:off-topic', label: 'Off-topic' },
                    { sig: 'down:too-basic', label: 'Too basic' },
                    { sig: 'down:know-it',   label: 'Know this' },
                  ].map(opt => (
                    <button
                      key={opt.sig}
                      onClick={() => sendSignal(opt.sig)}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: '.62rem', fontWeight: 700,
                        letterSpacing: '.05em',
                        padding: '4px 10px', borderRadius: 20,
                        border: '1.5px solid #E0DDD8',
                        background: '#FAFAF8', color: '#777',
                        cursor: 'pointer', transition: 'all .12s',
                        animation: 'fadeInUp .15s ease both',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#999'; e.currentTarget.style.color = '#333'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0DDD8'; e.currentTarget.style.color = '#777'; }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </>
              )}
            </div>

            <a
              href={post.url} target="_blank" rel="noopener noreferrer"
              onClick={handleTitleClick}
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                color: hovered ? s.accent : '#aaa',
                textDecoration: 'none', letterSpacing: '.02em',
                transition: 'color .15s',
                flexShrink: 0,
              }}
            >
              Read on Substack →
            </a>
          </div>
        )}

        {readOnly && (signals.read || signals.up || signals.down || signals['down:off-topic'] || signals['down:too-basic'] || signals['down:know-it']) && (
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {signals.read && <span style={{ fontFamily: 'var(--font-body)', fontSize: '.6rem', color: '#999', letterSpacing: '.1em', textTransform: 'uppercase' }}>Read ✓</span>}
            {signals.up   && <span style={{ fontFamily: 'var(--font-body)', fontSize: '.6rem', color: s.accent, letterSpacing: '.1em', textTransform: 'uppercase' }}>▲ Liked</span>}
            {(signals.down || signals['down:off-topic'] || signals['down:too-basic'] || signals['down:know-it']) && <span style={{ fontFamily: 'var(--font-body)', fontSize: '.6rem', color: '#bbb', letterSpacing: '.1em', textTransform: 'uppercase' }}>▼ Skipped</span>}
          </div>
        )}
      </div>
    </article>
  );
}
