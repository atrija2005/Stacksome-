import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import { useAuth } from '../components/AuthProvider';

const C = {
  ink:     '#181510',
  crimson: '#9b2335',
  muted:   '#8a7f72',
  rule:    '#c8bdb0',
};

export default function History() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => { if (user) fetchLists(); }, [user]);

  async function fetchLists() {
    const res = await fetch('/api/weekly-list?all=true');
    const data = await res.json();
    const lists = Array.isArray(data) ? data : [];
    setLists(lists);
    setLoading(false);
    if (lists.length > 0) selectList(lists[0].id);
  }

  async function selectList(id) {
    setSelected(id);
    const res = await fetch(`/api/weekly-list?id=${id}`);
    setDetail(await res.json());
  }

  if (loading) {
    return (
      <Layout>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.8rem', color: C.muted }}>
          Loading...
        </p>
      </Layout>
    );
  }

  if (lists.length === 0) {
    return (
      <Layout>
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', color: C.ink, marginBottom: '0.5rem' }}>
            No history yet
          </p>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.75rem', color: C.muted }}>
            Generate your first weekly list on the home page.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: 'flex', gap: '2.5rem' }}>

        {/* Sidebar */}
        <aside style={{ width: '8rem', flexShrink: 0 }}>
          <p style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: C.muted,
            marginBottom: '0.75rem',
          }}>
            Weeks
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {lists.map((l) => {
              const active = selected === l.id;
              return (
                <li key={l.id} style={{ marginBottom: '2px' }}>
                  <button
                    onClick={() => selectList(l.id)}
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontSize: '0.72rem',
                      textAlign: 'left',
                      width: '100%',
                      padding: '4px 0 4px 8px',
                      background: 'none',
                      border: 'none',
                      borderLeft: `2px solid ${active ? C.crimson : 'transparent'}`,
                      color: active ? C.crimson : C.ink,
                      fontWeight: active ? '700' : '400',
                      cursor: 'pointer',
                      transition: 'color 0.12s',
                    }}
                  >
                    {l.week_label}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {detail && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  color: C.ink,
                  margin: 0,
                }}>
                  Week {detail.week_label}
                </h2>
                <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.7rem', color: C.muted }}>
                  {new Date(detail.generated_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>

              <div>
                {detail.posts_json.map((post, i) => (
                  <PostCard
                    key={post.url}
                    post={post}
                    index={i + 1}
                    weekLabel={detail.week_label}
                    initialSignals={detail.signals || {}}
                    readOnly
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
