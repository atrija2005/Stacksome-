import { useState } from 'react';
import { useToast } from './Toast';

const TYPE = {
  core:     { label: 'On-Profile', color: '#FF6719', light: '#FFF3EC' },
  adjacent: { label: 'Adjacent',   color: '#0050c8', light: '#f0f5ff' },
  wild:     { label: 'Discovery',  color: '#FF6719', light: '#FFF3EC' },
};

const REFINE_MILESTONES = new Set([5, 10, 20, 35]);

function truncate(s, n) {
  if (!s) return '';
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > n ? c.slice(0, n).replace(/\s\S*$/, '') + '\u2026' : c;
}

export default function PostCard({ post, index, weekLabel, initialSignals = {}, readOnly = false, animDelay = 0 }) {
  const toast   = useToast();
  const [signals, setSignals] = useState(initialSignals[post.url] || {});
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const t       = TYPE[post.type] || TYPE.core;
  const isRead  = !!signals.read;
  const excerpt = truncate(post.description, 160);

  async function sendSignal(sig) {
    if (readOnly || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl: post.url, signal: sig, weekLabel }),
      });
      const data = await res.json();

      setSignals(prev => {
        const n = { ...prev };
        if (sig === 'up' || sig === 'down') { delete n.up; delete n.down; }
        n[sig] = true;
        return n;
      });

      if (sig === 'up' && data.upCount && REFINE_MILESTONES.has(data.upCount)) {
        toast(`${data.upCount} upvotes \u2014 refining your profile\u2026`, 'info');
        autoRefine(data.upCount);
      }
    } finally { setLoading(false); }
  }

  async function autoRefine(count) {
    try {
      const r = await fetch('/api/refine-profile', { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        toast(
          d.fallback
            ? 'Profile updated from your reading signals'
            : `Profile refined \u00b7 ${count} upvotes analysed by Claude`,
          'success'
        );
      }
    } catch { /* silent */ }
  }

  return (
    <article
      className="post-card anim-slide-up"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        border: `1px solid ${hovered ? '#c8c4be' : '#E5E5E5'}`,
        borderTop: `3px solid ${isRead ? '#D0CCCA' : t.color}`,
        borderRadius: 8,
        marginBottom: '1rem',
        background: isRead ? '#FAFAFA' : '#fff',
        opacity: isRead ? .65 : 1,
        animationDelay: `${animDelay}ms`,
        transition: 'opacity .2s, border-color .15s, box-shadow .2s',
        boxShadow: hovered && !isRead ? '0 8px 32px rgba(0,0,0,.07)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Watermark number */}
      <div className="card-number" style={{
        position: 'absolute', right: '1rem', bottom: '-.5rem',
        fontFamily: 'var(--font-display)',
        fontVariationSettings: "'opsz' 144",
        fontSize: '7rem', fontWeight: 900, lineHeight: 1,
        color: isRead ? '#f0eee8' : t.light,
        userSelect: 'none', pointerEvents: 'none',
        transition: 'color .2s', zIndex: 0,
      }}>
        {String(index).padStart(2, '0')}
      </div>

      {/* Content */}
      <div className="card-content" style={{ flex: 1, padding: '1.3rem 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* Badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
            letterSpacing: '.1em', textTransform: 'uppercase',
            padding: '3px 10px', background: t.color, color: '#fff',
            borderRadius: 4, flexShrink: 0,
          }}>
            {t.label}
          </span>
          {post.topic && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 600,
              letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '3px 9px',
              background: isRead ? '#f0eeeb' : '#f5f4f1',
              color: isRead ? '#bbb' : '#777',
              borderRadius: 4, flexShrink: 0,
              border: '1px solid #e8e6e2',
            }}>
              {post.topic}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', color: '#888', fontWeight: 500 }}>
            {post.publication}
          </span>
        </div>

        {/* Title */}
        <a
          href={post.url} target="_blank" rel="noopener noreferrer"
          onClick={() => !isRead && sendSignal('read')}
          style={{
            display: 'block', marginBottom: '.45rem',
            fontFamily: 'var(--font-display)',
            fontVariationSettings: "'opsz' 18",
            fontSize: 'clamp(1rem, 2.2vw, 1.18rem)', fontWeight: 700, lineHeight: 1.35,
            color: isRead ? '#aaa' : '#0f0f0f', textDecoration: 'none',
            transition: 'color .15s',
          }}
          onMouseEnter={e => { if (!isRead) e.currentTarget.style.color = t.color; }}
          onMouseLeave={e => { e.currentTarget.style.color = isRead ? '#aaa' : '#0f0f0f'; }}
        >
          {post.title}
        </a>

        {/* Excerpt */}
        {excerpt && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '.83rem', color: '#666',
            lineHeight: 1.7, marginBottom: '.6rem',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {excerpt}
          </p>
        )}

        {/* Why */}
        <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.9rem', alignItems: 'flex-start' }}>
          <span style={{ color: t.color, fontSize: '.9rem', lineHeight: 1.6, flexShrink: 0, fontWeight: 700 }}>\u203a</span>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontVariationSettings: "'opsz' 14",
            fontSize: '.83rem', fontStyle: 'italic',
            color: '#444', lineHeight: 1.65,
          }}>
            {post.why}
          </p>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            <button onClick={() => sendSignal('read')} disabled={loading} style={{
              fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
              letterSpacing: '.08em', textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 5,
              border: `1.5px solid ${isRead ? '#555' : '#ddd'}`,
              color: isRead ? '#fff' : '#888',
              background: isRead ? '#555' : 'transparent',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .15s',
            }}>
              {isRead ? '\u2713 Read' : 'Mark read'}
            </button>

            <button onClick={() => sendSignal('up')} disabled={loading} title="Worth it" style={{
              fontFamily: 'var(--font-body)', fontSize: '.82rem', padding: '6px 13px', borderRadius: 5,
              border: `1.5px solid ${signals.up ? t.color : '#ddd'}`,
              color: signals.up ? t.color : '#bbb',
              background: signals.up ? t.light : 'transparent',
              fontWeight: signals.up ? 700 : 400,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .15s',
            }}>\u25b2</button>

            <button onClick={() => sendSignal('down')} disabled={loading} title="Not for me" style={{
              fontFamily: 'var(--font-body)', fontSize: '.82rem', padding: '6px 13px', borderRadius: 5,
              border: '1.5px solid #ddd', color: '#bbb',
              background: signals.down ? '#f5f4f2' : 'transparent',
              opacity: signals.down ? 1 : .5,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .15s',
            }}>\u25bc</button>
          </div>
        )}

        {readOnly && (signals.read || signals.up || signals.down) && (
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {signals.read && <span style={{ fontFamily: 'var(--font-body)', fontSize: '.6rem', color: '#999', letterSpacing: '.1em', textTransform: 'uppercase' }}>Read \u2713</span>}
            {signals.up   && <span style={{ fontFamily: 'var(--font-body)', fontSize: '.6rem', color: t.color, letterSpacing: '.1em', textTransform: 'uppercase' }}>\u25b2 Liked</span>}
            {signals.down && <span style={{ fontFamily: 'var(--font-body)', fontSize: '.6rem', color: '#bbb', letterSpacing: '.1em', textTransform: 'uppercase' }}>\u25bc Skipped</span>}
          </div>
        )}
      </div>
    </article>
  );
}
