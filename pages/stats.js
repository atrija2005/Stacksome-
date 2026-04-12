import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../components/AuthProvider';

/* ── Mini bar chart ───────────────────────────────────────────────────────── */
function WeekBar({ label, value, max, delay }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700,
        color: value > 0 ? '#0A0A0A' : '#CCC',
      }}>
        {value > 0 ? value : ''}
      </span>
      <div style={{
        width: '100%', height: 80,
        display: 'flex', alignItems: 'flex-end',
      }}>
        <div style={{
          width: '100%',
          height: `${pct}%`,
          background: value >= 8 ? '#FF6719' : value >= 5 ? '#FF8C4B' : value > 0 ? '#FFB580' : '#F0EEE9',
          borderRadius: '4px 4px 0 0',
          transition: `height .6s cubic-bezier(.22,1,.36,1) ${delay}ms`,
          minHeight: value > 0 ? 4 : 0,
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.62rem', color: '#AAA',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ value, label, sub, accent, icon, large }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EEECEA', borderRadius: 14,
      padding: '1.5rem 1.75rem',
      borderTop: `3px solid ${accent || '#EEECEA'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontVariationSettings: "'opsz' 72",
            fontSize: large ? 'clamp(2.2rem,4vw,3rem)' : 'clamp(1.8rem,3vw,2.4rem)',
            fontWeight: 900, color: accent || '#0A0A0A',
            lineHeight: 1, letterSpacing: '-.03em',
            marginBottom: '.3rem',
          }}>
            {value}
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 600,
            color: '#0A0A0A', marginBottom: sub ? '.2rem' : 0,
          }}>
            {label}
          </div>
          {sub && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: '#999' }}>
              {sub}
            </div>
          )}
        </div>
        {icon && (
          <span style={{ fontSize: '1.6rem', opacity: .5 }}>{icon}</span>
        )}
      </div>
    </div>
  );
}

/* ── Publication row ──────────────────────────────────────────────────────── */
function PubRow({ name, count, max, rank }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '.8rem 0', borderBottom: '1px solid #F0EEE9',
    }}>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.7rem', fontWeight: 700,
        color: rank <= 3 ? '#FF6719' : '#CCC',
        width: 20, textAlign: 'center', flexShrink: 0,
      }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
      </span>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.875rem', fontWeight: 500,
        color: '#0A0A0A', flex: '0 0 180px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      <div style={{ flex: 1, height: 6, background: '#F0EEE9', borderRadius: 99 }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #FF6719, #FF8C4B)',
          borderRadius: 99,
          transition: 'width .6s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 700,
        color: '#FF6719', width: 28, textAlign: 'right', flexShrink: 0,
      }}>
        {count}
      </span>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '.68rem', color: '#BBB',
        flexShrink: 0,
      }}>
        like{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

/* ── Section label ────────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p style={{
      fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
      letterSpacing: '.14em', textTransform: 'uppercase',
      color: '#FF6719', marginBottom: '.75rem',
    }}>
      {children}
    </p>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function Stats() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetch('/api/stats').then(r => r.json()).then(setStats);
  }, [user]);

  if (!stats) return (
    <Layout>
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', color: '#999' }}>Loading your stats…</p>
      </div>
    </Layout>
  );

  if (stats.totalCurated === 0) return (
    <Layout>
      <div style={{ padding: '5rem 0', textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
          fontSize: '1.5rem', fontWeight: 900, color: '#0A0A0A', marginBottom: '.75rem',
        }}>
          No data yet
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', color: '#999', lineHeight: 1.7 }}>
          Generate your first weekly reading list and start marking posts as read, liked, or skipped — your stats will appear here.
        </p>
      </div>
    </Layout>
  );

  const readRate    = stats.totalCurated > 0 ? Math.round((stats.totalRead / stats.totalCurated) * 100) : 0;
  const likeRate    = stats.totalRead    > 0 ? Math.round((stats.totalUp   / stats.totalRead)    * 100) : 0;
  const maxTrend    = Math.max(...(stats.weeklyTrends?.map(w => w.read_count) || [0]), 1);
  const maxLikes    = Math.max(...(stats.pubSignals?.map(p => p.up_count)     || [0]), 1);

  const trendData = (stats.weeklyTrends || []).map(w => ({
    label: w.week_label.replace(/^\d{4}-/, ''),
    value: w.read_count,
  }));

  // Reading consistency — streak of consecutive weeks with ≥1 read post
  const streak = (() => {
    let s = 0;
    for (let i = (stats.weeklyTrends || []).length - 1; i >= 0; i--) {
      if (stats.weeklyTrends[i].read_count > 0) s++; else break;
    }
    return s;
  })();

  // Grade
  const grade = readRate >= 80 ? { label: 'Excellent', color: '#16a34a', note: 'You read almost everything curated for you.' }
              : readRate >= 50 ? { label: 'Good',      color: '#FF6719', note: 'Solid engagement. Keep pushing.' }
              : readRate >= 25 ? { label: 'Building',  color: '#b07d2a', note: 'Getting started. The habit will come.' }
              :                  { label: 'Early days', color: '#999',   note: 'Just getting started — every read counts.' };

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: '2.25rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
            fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900,
            color: '#0A0A0A', letterSpacing: '-.02em', marginBottom: '.35rem',
          }}>
            Your Reading Stats
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '.875rem', color: '#999', lineHeight: 1.6 }}>
            A snapshot of your reading habit across {stats.weeksActive} week{stats.weeksActive !== 1 ? 's' : ''} on Stacksome.
          </p>
        </div>

        {/* ── Top metric cards ── */}
        <div className="stats-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem', marginBottom: '2rem',
        }}>
          <StatCard
            value={stats.totalRead}
            label="Posts read"
            sub={`out of ${stats.totalCurated} curated`}
            accent="#0050c8"
            icon="📖"
          />
          <StatCard
            value={`${readRate}%`}
            label="Read rate"
            sub={grade.label}
            accent={grade.color}
            icon="🎯"
          />
          <StatCard
            value={stats.totalUp}
            label="Posts liked"
            sub={stats.totalRead > 0 ? `${likeRate}% of what you read` : 'Start reading to see this'}
            accent="#FF6719"
            icon="👍"
          />
          <StatCard
            value={`${streak}w`}
            label="Current streak"
            sub={streak > 1 ? `${streak} weeks in a row` : streak === 1 ? 'Active this week' : 'No streak yet'}
            accent={streak >= 3 ? '#FF6719' : '#999'}
            icon="🔥"
          />
        </div>

        {/* ── Read rate explainer ── */}
        <div style={{
          background: '#fff', border: '1px solid #EEECEA', borderRadius: 14,
          padding: '1.75rem 2rem', marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <SectionLabel>How much you actually read</SectionLabel>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.875rem', color: '#555', lineHeight: 1.6, maxWidth: 480 }}>
                {grade.note} You&apos;ve read <strong>{stats.totalRead}</strong> of the <strong>{stats.totalCurated}</strong> posts Stacksome has curated for you.
              </p>
            </div>
            <div style={{
              background: '#F8F8F6', border: '1px solid #EEECEA', borderRadius: 10,
              padding: '.75rem 1.25rem', textAlign: 'center', flexShrink: 0,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 48",
                fontSize: '2rem', fontWeight: 900, color: grade.color, lineHeight: 1,
              }}>
                {readRate}%
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '.68rem', color: '#999', marginTop: '.2rem' }}>
                read rate
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: '#F0EEE9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${readRate}%`,
              background: `linear-gradient(90deg, ${grade.color}, ${grade.color}AA)`,
              borderRadius: 99,
              transition: 'width .8s cubic-bezier(.22,1,.36,1)',
            }} />
          </div>

          {/* Signal breakdown below bar */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { emoji: '👍', label: 'Liked',   value: stats.totalUp,   color: '#FF6719' },
              { emoji: '👎', label: 'Skipped', value: stats.totalDown, color: '#BBB' },
              { emoji: '✅', label: 'Marked read', value: stats.totalRead, color: '#0050c8' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span style={{ fontSize: '.9rem' }}>{s.emoji}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 700, color: s.color }}>
                  {s.value}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: '#999' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly trend ── */}
        {trendData.length > 1 && (
          <div style={{
            background: '#fff', border: '1px solid #EEECEA', borderRadius: 14,
            padding: '1.75rem 2rem', marginBottom: '2rem',
          }}>
            <SectionLabel>Weekly reading trend</SectionLabel>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', color: '#999', marginBottom: '1.5rem' }}>
              Posts you read each week — darker orange = more reading done.
            </p>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
              {trendData.map((d, i) => (
                <WeekBar key={i} label={d.label} value={d.value} max={maxTrend} delay={i * 50} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F0EEE9' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: '#999' }}>
                Best week: <strong style={{ color: '#0A0A0A' }}>{Math.max(...trendData.map(d => d.value))} posts</strong>
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: '#999' }}>
                Average: <strong style={{ color: '#0A0A0A' }}>
                  {(trendData.reduce((a, d) => a + d.value, 0) / trendData.length).toFixed(1)} posts/week
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* ── Top liked publications ── */}
        {stats.pubSignals?.length > 0 && (
          <div style={{
            background: '#fff', border: '1px solid #EEECEA', borderRadius: 14,
            padding: '1.75rem 2rem', marginBottom: '2rem',
          }}>
            <SectionLabel>Publications you love most</SectionLabel>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', color: '#999', marginBottom: '1.25rem' }}>
              Ranked by how many times you liked a post from each publication.
            </p>
            {stats.pubSignals.map((p, i) => (
              <PubRow key={p.url || p.name} name={p.name} count={p.up_count} max={maxLikes} rank={i + 1} />
            ))}
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: '#CCC', marginTop: '1rem' }}>
              Tip — Stacksome prioritises your favourite publications in future lists.
            </p>
          </div>
        )}

        {/* ── Summary card ── */}
        <div style={{
          background: '#0A0A0A', borderRadius: 14,
          padding: '2rem 2.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1.5rem',
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 24",
              fontSize: '1.15rem', fontWeight: 900, color: '#fff', marginBottom: '.4rem',
            }}>
              {streak >= 3
                ? `${streak}-week streak 🔥 Keep going.`
                : stats.totalRead >= 20
                ? 'You\'re a serious reader. Keep it up.'
                : 'Your reading habit is taking shape.'}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
              {stats.totalUp} liked · {stats.totalRead} read · {stats.weeksActive} weeks active
            </p>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 144",
            fontSize: '3.5rem', fontWeight: 900,
            color: grade.color, letterSpacing: '-.03em', lineHeight: 1,
          }}>
            {grade.label}
          </div>
        </div>

      </div>
    </Layout>
  );
}
