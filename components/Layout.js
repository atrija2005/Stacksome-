import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthProvider';

const NAV = [
  { href: '/',          label: 'This Week' },
  { href: '/search',    label: 'Search' },
  { href: '/history',   label: 'History' },
  { href: '/stats',     label: 'Stats' },
  { href: '/about',     label: 'About' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [ready, setReady]       = useState(false);
  const [menuOpen, setMenu]     = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setReady(false); setMenu(false); }, [router.pathname]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, [router.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isLoggedIn = !!user;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Stacksome — Read to Become</title>
        <meta name="description" content="Your personal Substack reading intelligence. 10 curated posts a week, matched to your intellectual ambitions." />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#fff' }}>

        {/* Substack-style orange top bar */}
        <div style={{ height: 3, background: '#FF6719' }} />

        {/* Masthead */}
        <header style={{
          background: '#0a0a0a',
          position: 'sticky', top: 0, zIndex: 100,
          transition: 'box-shadow .2s ease',
          boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,.3)' : 'none',
        }}>
          <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '.65rem 0',
            }}>
              {/* Brand */}
              <Link href="/landing" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <h1 className={ready ? 'anim-slide-down' : ''} style={{
                  fontFamily: 'var(--font-display)',
                  fontVariationSettings: "'opsz' 48",
                  fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
                  fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1,
                  color: '#fff', cursor: 'pointer',
                  transition: 'opacity .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Stacksome
                </h1>
              </Link>

              {/* Desktop nav — only for logged in users */}
              {isLoggedIn && (
                <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '.15rem' }}>
                  {NAV.map(item => {
                    const active = router.pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}
                        className={`nav-link ${active ? 'nav-link-active' : ''}`}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '.82rem', fontWeight: active ? 600 : 500,
                          padding: '.5rem .9rem',
                          color: active ? '#fff' : '#999',
                          borderRadius: 6,
                          background: active ? 'rgba(255,255,255,.08)' : 'transparent',
                          transition: 'all .15s',
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}

                  {/* User menu */}
                  <div style={{ marginLeft: '.75rem', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    {user.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt=""
                        style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #333' }}
                      />
                    )}
                    <Link
                      href="/settings"
                      title="Settings"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 6,
                        border: `1px solid ${router.pathname === '/settings' ? '#FF6719' : '#333'}`,
                        color: router.pathname === '/settings' ? '#FF6719' : '#888',
                        background: router.pathname === '/settings' ? 'rgba(255,103,25,.12)' : 'transparent',
                        fontSize: '1rem', textDecoration: 'none',
                        transition: 'all .15s',
                      }}
                    >
                      ⚙
                    </Link>
                    <button
                      onClick={signOut}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 500,
                        padding: '5px 12px', borderRadius: 4,
                        border: '1px solid #333', color: '#888', background: 'transparent',
                        cursor: 'pointer', transition: 'all .15s',
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </nav>
              )}

              {/* Mobile hamburger */}
              {isLoggedIn && (
                <button
                  className="mobile-hamburger"
                  onClick={() => setMenu(o => !o)}
                  style={{
                    background: 'none', border: 'none', color: '#888',
                    cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1,
                    padding: '6px', display: 'none',
                  }}
                >
                  {menuOpen ? '\u2715' : '\u2630'}
                </button>
              )}
            </div>

            {/* Tagline — only on home when logged in */}
            {router.pathname === '/' && isLoggedIn && (
              <div className={ready ? 'anim-fade-in' : ''} style={{
                textAlign: 'center', paddingBottom: '.9rem', animationDelay: '200ms',
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.72rem',
                  letterSpacing: '.2em', textTransform: 'uppercase',
                  color: '#666', fontWeight: 500,
                }}>
                  Read &middot; Reflect &middot; Become
                </p>
              </div>
            )}

            {/* Mobile dropdown */}
            {menuOpen && isLoggedIn && (
              <nav className="mobile-dropdown" style={{
                borderTop: '1px solid #1e1e1e',
                animation: 'fadeIn .18s ease both', paddingBottom: '.5rem',
              }}>
                {NAV.map(item => {
                  const active = router.pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMenu(false)}
                      style={{
                        display: 'block', padding: '.85rem 1rem',
                        fontFamily: 'var(--font-body)', fontSize: '.9rem',
                        fontWeight: active ? 600 : 400, textDecoration: 'none',
                        color: active ? '#fff' : '#999',
                        background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                        borderRadius: 6, margin: '2px 0',
                      }}>
                      {item.label}
                    </Link>
                  );
                })}
                <Link href="/settings" onClick={() => setMenu(false)}
                  style={{
                    display: 'block', padding: '.85rem 1rem',
                    fontFamily: 'var(--font-body)', fontSize: '.9rem',
                    fontWeight: router.pathname === '/settings' ? 600 : 400,
                    textDecoration: 'none',
                    color: router.pathname === '/settings' ? '#FF6719' : '#999',
                    background: router.pathname === '/settings' ? 'rgba(255,103,25,.08)' : 'transparent',
                    borderRadius: 6, margin: '2px 0',
                  }}>
                  ⚙ Settings
                </Link>
                <button onClick={signOut} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '.85rem 1rem', fontFamily: 'var(--font-body)',
                  fontSize: '.9rem', color: '#666', background: 'transparent',
                  border: 'none', cursor: 'pointer', borderTop: '1px solid #1e1e1e',
                  marginTop: '.5rem',
                }}>
                  Sign Out
                </button>
              </nav>
            )}
          </div>
        </header>

        <main style={{
          maxWidth: 1120, margin: '0 auto',
          padding: 'clamp(1.5rem,4vw,3rem) clamp(1rem,3vw,1.5rem)',
        }}>
          {children}
        </main>

        <footer style={{
          maxWidth: 1120, margin: '3rem auto 0',
          padding: '1.5rem',
          borderTop: '1px solid #e8e4de',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '.5rem',
        }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', fontWeight: 500, color: '#bbb' }}>
            Stacksome &copy; {new Date().getFullYear()}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: '#ccc' }}>
            Powered by <span style={{ fontWeight: 600, color: '#999' }}>At&amp;At</span>
          </span>
        </footer>
      </div>
    </>
  );
}
