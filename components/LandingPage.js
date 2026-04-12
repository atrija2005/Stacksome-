import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';

/* ── Google icon ─────────────────────────────────────────────────────────── */
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

/* ── Mock product card ───────────────────────────────────────────────────── */
function MockCard({ type, title, pub, why, delay }) {
  const isDiscover = type === 'discover';
  return (
    <div
      className="anim-fade-in-up"
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '1.25rem 1.4rem',
        border: '1px solid #EEECEA',
        borderTop: `3px solid ${isDiscover ? '#FF6719' : '#0050c8'}`,
        boxShadow: '0 8px 40px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)',
        animationDelay: delay,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.65rem' }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '.6rem', fontWeight: 700,
          letterSpacing: '.1em', textTransform: 'uppercase',
          padding: '3px 9px', borderRadius: 4,
          background: isDiscover ? '#FF6719' : '#0050c8',
          color: '#fff',
        }}>
          {isDiscover ? 'Discovery' : 'Your Stack'}
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: '#999' }}>{pub}</span>
      </div>
      <p style={{
        fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 18",
        fontSize: '.95rem', fontWeight: 700, color: '#0A0A0A',
        lineHeight: 1.35, marginBottom: '.5rem',
      }}>
        {title}
      </p>
      <p style={{
        fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 14",
        fontSize: '.78rem', fontStyle: 'italic', color: '#555',
        lineHeight: 1.6,
      }}>
        {why}
      </p>
      <div style={{ display: 'flex', gap: '.4rem', marginTop: '.85rem' }}>
        {['Mark read', '\u25b2', '\u25bc'].map((label, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 600,
            padding: '4px 10px', borderRadius: 5,
            border: '1.5px solid #E8E8E5', color: '#999',
            letterSpacing: '.06em', textTransform: i === 0 ? 'uppercase' : 'none',
          }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Data ────────────────────────────────────────────────────────────────── */
const MOCK_CARDS = [
  {
    type: 'discover',
    title: 'The Discipline of Thinking Slowly in a World Built for Speed',
    pub: 'Ribbonfarm',
    why: 'Matches your interest in cognitive science and decision-making under uncertainty.',
    delay: '200ms',
  },
  {
    type: 'stack',
    title: 'Why Founders Who Read History Build More Resilient Companies',
    pub: 'Not Boring',
    why: 'From your stack \u2014 one of Packy\u2019s best-researched pieces this quarter.',
    delay: '340ms',
  },
  {
    type: 'discover',
    title: 'The Hidden Architecture of Every Idea That Changed the World',
    pub: 'Works in Progress',
    why: 'Aligns with your goal of understanding long-range technological shifts.',
    delay: '480ms',
  },
];

const HOW_STEPS = [
  {
    n: '01',
    title: 'Tell us who you\u2019re becoming',
    desc: 'Add the Substack writers you follow. Describe your intellectual ambitions in a paragraph \u2014 not just your interests, but the person you\u2019re working to become.',
  },
  {
    n: '02',
    title: 'We read everything',
    desc: 'Stacksome fetches posts from 500+ curated publications and uses Claude to score every piece against your unique profile. You never see the noise.',
  },
  {
    n: '03',
    title: 'You read what matters',
    desc: '10 essays land in your curriculum every week. 7 are writers you\u2019ve never heard of. 3 are your trusted voices at their best. Every upvote makes the next list sharper.',
  },
];

const MARQUEE_ITEMS = [
  'Fresh Discoveries', '\u2736', 'Matched to Your Ambitions', '\u2736',
  '500+ Publications', '\u2736', 'Powered by Claude', '\u2736',
  'Gets Smarter Every Week', '\u2736', 'Your Intellectual Edge', '\u2736',
  'Zero Doom-Scrolling', '\u2736', '10 Essays. Weekly.', '\u2736',
];

const FAQ_ITEMS = [
  {
    q: 'Is Stacksome free?',
    a: 'Yes — completely free to use. No credit card, no trial period, no hidden upgrade. Sign in with Google and your first curriculum is ready in under two minutes.',
  },
  {
    q: 'How does it pick which articles I see?',
    a: 'You write a short profile describing your intellectual goals — not just "I like tech" but who you\'re trying to become. Stacksome then scores every post from 500+ publications against that profile using Claude, and surfaces the 10 highest-signal essays every week.',
  },
  {
    q: 'Does it work with any Substack newsletter?',
    a: 'Yes. Add any Substack publication to your stack and Stacksome will fetch their latest posts. The discovery pool — the 7 new writers each week — comes from a curated library of 500+ newsletters across every domain.',
  },
  {
    q: 'What\'s the difference between "Your Stack" and "Discoveries"?',
    a: '"Your Stack" posts come from newsletters you already subscribe to — surfaced based on relevance to your profile. "Discoveries" come from publications you\'ve never read, picked to expand your thinking. Every week you get 3 from your stack and 7 from discoveries.',
  },
  {
    q: 'How do upvotes and downvotes work?',
    a: 'Every upvote (👍) tells Stacksome you want more like this. Every downvote (👎) prunes that direction. At 5, 10, and 20 total signals, your intellectual profile is automatically rewritten from scratch — the recommendations compound over time.',
  },
  {
    q: 'Can I use it on mobile?',
    a: 'Yes — Stacksome is fully responsive. It works in any browser on any device. There\'s no app to download.',
  },
];

/* ── Component ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { signInWithGoogle, configured } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [year, setYear] = useState(2025);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setYear(new Date().getFullYear());
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  async function handleSignIn() {
    if (configured) {
      // Production: trigger Google OAuth
      setSigningIn(true);
      try { await signInWithGoogle(); }
      catch { router.push('/setup'); setSigningIn(false); }
    } else {
      // Dev / OAuth not yet wired up: go straight to onboarding
      router.push('/setup');
    }
  }

  const marqueeAll = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <>
      <Head>
        <title>Stacksome — Your feed is built for engagement. We&apos;re built for you.</title>
        <meta name="description" content="Stacksome reads 500+ Substack newsletters every week and picks the 10 best posts for you — matched to your interests by AI. Free." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Stacksome — Read to Become" />
        <meta property="og:description" content="AI reads 500+ Substack newsletters and picks your 10 best essays every week — matched to your intellectual ambitions. Free." />
        <meta property="og:url" content="https://stacksome.com" />
        <meta property="og:site_name" content="Stacksome" />

        {/* Twitter / X card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Stacksome — Read to Become" />
        <meta name="twitter:description" content="AI reads 500+ Substack newsletters and picks your 10 best essays every week — matched to your intellectual ambitions. Free." />
        <meta name="twitter:creator" content="@stacksome" />
      </Head>

      <div style={{ fontFamily: 'var(--font-body)', color: '#0A0A0A', overflowX: 'hidden' }}>

        {/* ════════════════════════════════════════════════════════════════════
            DARK ZONE — nav + hero
            ════════════════════════════════════════════════════════════════ */}
        <div className="grain" style={{ background: '#0A0A0A', position: 'relative' }}>

          {/* Ambient orbs */}
          <div className="hero-orb" style={{ width: 700, height: 700, background: 'rgba(255,103,25,.1)', top: -200, right: -150, animationDuration: '12s' }} />
          <div className="hero-orb" style={{ width: 500, height: 500, background: 'rgba(0,80,200,.08)', bottom: -100, left: -100, animationDelay: '-4s', animationDuration: '9s' }} />
          <div className="hero-orb" style={{ width: 350, height: 350, background: 'rgba(255,103,25,.06)', top: '40%', left: '40%', animationDelay: '-7s', animationDuration: '14s' }} />

          {/* Content above grain */}
          <div style={{ position: 'relative', zIndex: 2 }}>

            {/* ── Orange top strip ───────────────────────────────────────── */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,#FF6719,#FF8C4B,#FF6719)', backgroundSize: '200% 100%', animation: 'gradientShift 4s ease infinite' }} />

            {/* ── Nav ────────────────────────────────────────────────────── */}
            <nav style={{
              maxWidth: 1100, margin: '0 auto',
              padding: '1.5rem 2rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'relative',
            }}>
              <span
                className="anim-fade-in"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontVariationSettings: "'opsz' 144",
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-.03em',
                  lineHeight: 1,
                  animationDelay: '0ms',
                }}
              >
                Stacksome
              </span>

              {/* Anchor links */}
              <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                {[
                  { href: '#how-it-works', label: 'How it works' },
                  { href: '#features', label: 'Features' },
                  { href: '#faq', label: 'FAQ' },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 500,
                      color: 'rgba(255,255,255,.5)', padding: '.45rem .85rem',
                      borderRadius: 6, textDecoration: 'none',
                      transition: 'color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.9)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.5)'}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <button
                onClick={handleSignIn}
                disabled={signingIn}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '9px 20px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,.15)',
                  background: 'rgba(255,255,255,.06)',
                  backdropFilter: 'blur(12px)',
                  color: 'rgba(255,255,255,.85)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '.85rem', fontWeight: 500,
                  cursor: signingIn ? 'wait' : 'pointer',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}
              >
                <GoogleIcon />
                {signingIn ? 'Signing in\u2026' : 'Sign in'}
              </button>

              {/* Mobile hamburger */}
              <button
                className="landing-hamburger"
                onClick={() => setMobileMenu(o => !o)}
                style={{
                  display: 'none',
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,.7)', cursor: 'pointer',
                  fontSize: '1.3rem', lineHeight: 1, padding: '4px',
                }}
              >
                {mobileMenu ? '✕' : '☰'}
              </button>

              {/* Mobile dropdown */}
              {mobileMenu && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#111', borderTop: '1px solid #222',
                  padding: '.75rem 2rem 1rem',
                  display: 'flex', flexDirection: 'column', gap: '.25rem',
                  zIndex: 50,
                }}>
                  {[
                    { href: '#how-it-works', label: 'How it works' },
                    { href: '#features', label: 'Features' },
                    { href: '#faq', label: 'FAQ' },
                  ].map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenu(false)}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 500,
                        color: 'rgba(255,255,255,.6)', padding: '.7rem .5rem',
                        borderBottom: '1px solid #1e1e1e', textDecoration: 'none',
                        display: 'block',
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                  <button
                    onClick={() => { setMobileMenu(false); handleSignIn(); }}
                    style={{
                      marginTop: '.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                      background: '#FF6719', color: '#fff',
                      padding: '12px 20px', borderRadius: 8,
                      fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700,
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <GoogleIcon />
                    Start reading for free
                  </button>
                </div>
              )}
            </nav>

            {/* ── Hero ───────────────────────────────────────────────────── */}
            <section style={{
              maxWidth: 1100, margin: '0 auto',
              padding: 'clamp(2rem, 4vw, 3.5rem) 2rem clamp(2.5rem, 5vw, 4.5rem)',
              textAlign: 'center',
            }}>

              {/* Eyebrow */}
              <div
                className="anim-fade-in"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                  border: '1px solid rgba(255,103,25,.35)',
                  background: 'rgba(255,103,25,.1)',
                  borderRadius: 99, padding: '6px 16px',
                  fontSize: '.72rem', fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase',
                  color: '#FF8C4B', marginBottom: '2.25rem',
                  animationDelay: '100ms',
                }}
              >
                <span className="dot-pulse" />
                Personal Substack Intelligence
              </div>

              {/* Headline — word-by-word reveal */}
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: "'opsz' 144",
                fontSize: 'clamp(2rem, 5.5vw, 4.2rem)',
                fontWeight: 900,
                lineHeight: .97,
                letterSpacing: '-.04em',
                perspective: '1200px',
                marginBottom: '1.75rem',
              }}>
                {/* Line 1 */}
                <span style={{ display: 'block', marginBottom: '.1em' }}>
                  {['Your', 'feed', 'is', 'built', 'for', 'engagement.'].map((w, i) => (
                    <span key={w} className="anim-word-reveal" style={{ color: 'rgba(255,255,255,.45)', marginRight: '.22em', animationDelay: `${200 + i * 75}ms` }}>
                      {w}
                    </span>
                  ))}
                </span>
                {/* Line 2 */}
                <span style={{ display: 'block' }}>
                  {['Stacksome', 'is', 'built', 'for'].map((w, i) => (
                    <span key={w} className="anim-word-reveal" style={{ color: '#fff', marginRight: '.22em', animationDelay: `${650 + i * 75}ms` }}>
                      {w}
                    </span>
                  ))}
                  <span className="anim-word-reveal" style={{ color: '#FF6719', fontStyle: 'italic', display: 'inline-block', animationDelay: '950ms' }}>
                    you.
                  </span>
                </span>
              </h1>

              {/* Sub-headline */}
              <p
                className="anim-fade-in-up"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                  color: 'rgba(255,255,255,.55)',
                  lineHeight: 1.8,
                  maxWidth: 580, margin: '0 auto 2.75rem',
                  animationDelay: '1000ms',
                }}
              >
                Every week, AI reads hundreds of Substack newsletters and picks
                the 10 posts most relevant to your interests. Fresh writers you&apos;ve
                never heard of, plus the best from ones you already follow.
              </p>

              {/* CTA */}
              <div className="anim-fade-in-up" style={{ animationDelay: '1100ms' }}>
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className="btn-glow"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.7rem',
                    background: '#FF6719', color: '#fff',
                    padding: '16px 36px', borderRadius: 10,
                    fontSize: '1rem', fontWeight: 700,
                    fontFamily: 'var(--font-body)',
                    border: 'none',
                    cursor: signingIn ? 'wait' : 'pointer',
                    letterSpacing: '.01em',
                  }}
                >
                  <GoogleIcon size={20} />
                  {signingIn ? 'Signing in\u2026' : 'Start reading for free'}
                </button>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: 'rgba(255,255,255,.3)', marginTop: '.9rem' }}>
                  No credit card \u00b7 No spam \u00b7 Takes 60 seconds to set up
                </p>
              </div>

              {/* Stats */}
              <div
                className="anim-fade-in-up"
                style={{
                  display: 'flex', justifyContent: 'center',
                  gap: 'clamp(1.5rem, 4vw, 4rem)',
                  flexWrap: 'wrap',
                  marginTop: 'clamp(3rem, 6vw, 5rem)',
                  paddingTop: '2.5rem',
                  borderTop: '1px solid rgba(255,255,255,.08)',
                  animationDelay: '1200ms',
                }}
              >
                {[
                  { n: '500+', label: 'Publications monitored' },
                  { n: '10',   label: 'Essays curated weekly' },
                  { n: '7',    label: 'Fresh discoveries every time' },
                ].map((s, i) => (
                  <div key={s.label} className="anim-count-up" style={{ textAlign: 'center', animationDelay: `${1300 + i * 120}ms` }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontVariationSettings: "'opsz' 72",
                      fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                      fontWeight: 900, color: '#fff',
                      lineHeight: 1, letterSpacing: '-.03em',
                    }}>
                      {s.n}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', color: 'rgba(255,255,255,.4)', marginTop: '.3rem', fontWeight: 500 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            PRODUCT PREVIEW — floats at the seam of dark/light
            ════════════════════════════════════════════════════════════════ */}
        <div style={{ background: 'linear-gradient(to bottom, #0A0A0A 0%, #0A0A0A 40%, #F8F8F6 40%, #F8F8F6 100%)', padding: '0 2rem' }}>
          <div style={{
            maxWidth: 980, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}>
            {MOCK_CARDS.map(c => <MockCard key={c.title} {...c} />)}
          </div>
          <p style={{
            textAlign: 'center', paddingTop: '1.5rem', paddingBottom: '3rem',
            fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 600,
            letterSpacing: '.1em', textTransform: 'uppercase', color: '#BBB',
          }}>
            Your weekly curriculum \u2014 an example of what Stacksome curates
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            MARQUEE
            ════════════════════════════════════════════════════════════════ */}
        <div style={{
          overflow: 'hidden',
          borderTop: '1px solid #EEECEA',
          borderBottom: '1px solid #EEECEA',
          padding: '15px 0',
          background: '#fff',
        }}>
          <div className="marquee-track">
            {marqueeAll.map((item, i) => (
              <span
                key={i}
                style={{
                  padding: '0 1.75rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '.78rem',
                  fontWeight: item === '\u2736' ? 400 : 700,
                  color: item === '\u2736' ? '#FF6719' : '#AAAAAA',
                  letterSpacing: item === '\u2736' ? 0 : '.08em',
                  textTransform: item === '\u2736' ? 'none' : 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            HOW IT WORKS
            ════════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" style={{ background: '#F8F8F6', padding: 'clamp(3rem, 6vw, 5.5rem) 2rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 6vw, 5.5rem)' }}>
              <p className="reveal" style={{
                fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#FF6719', marginBottom: '.75rem',
              }}>
                How it works
              </p>
              <h2 className="reveal reveal-delay-1" style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: "'opsz' 72",
                fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
                fontWeight: 900, color: '#0A0A0A',
                lineHeight: 1.05, letterSpacing: '-.03em',
              }}>
                Three steps to a reading life{' '}
                <span style={{ fontStyle: 'italic', color: '#FF6719' }}>worth having.</span>
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}>
              {HOW_STEPS.map((s, i) => (
                <div
                  key={s.n}
                  className={`reveal reveal-delay-${i + 1}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #EEECEA',
                    borderRadius: 14,
                    padding: '2.25rem 2rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Background number watermark */}
                  <div style={{
                    position: 'absolute', right: '1.5rem', bottom: '-1rem',
                    fontFamily: 'var(--font-display)',
                    fontVariationSettings: "'opsz' 144",
                    fontSize: '9rem', fontWeight: 900, lineHeight: 1,
                    color: '#F0EEE9', userSelect: 'none', pointerEvents: 'none',
                  }}>
                    {s.n}
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontVariationSettings: "'opsz' 48",
                      fontSize: '1.1rem', fontWeight: 700,
                      color: '#FF6719', marginBottom: '1rem',
                      letterSpacing: '.02em',
                    }}>
                      {s.n}
                    </div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontVariationSettings: "'opsz' 24",
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
                      fontWeight: 700, color: '#0A0A0A',
                      lineHeight: 1.25, marginBottom: '.85rem',
                      letterSpacing: '-.01em',
                    }}>
                      {s.title}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '.9rem', color: '#6B6B6B', lineHeight: 1.75 }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            BIG QUOTE / PROBLEM STATEMENT
            ════════════════════════════════════════════════════════════════ */}
        <section className="grain" style={{ background: '#0A0A0A', padding: 'clamp(3rem, 6vw, 5.5rem) 2rem', position: 'relative' }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
            <p className="reveal" style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.14em', textTransform: 'uppercase',
              color: '#FF6719', marginBottom: '2rem',
            }}>
              The problem
            </p>
            <blockquote className="reveal reveal-delay-1" style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: "'opsz' 48",
              fontSize: 'clamp(1.2rem, 2.8vw, 2rem)',
              fontWeight: 400, fontStyle: 'italic',
              color: 'rgba(255,255,255,.9)',
              lineHeight: 1.35, letterSpacing: '-.02em',
              marginBottom: '2.5rem',
            }}>
              &ldquo;The best essay you&apos;ll ever read is already published on Substack.
              You just don&apos;t follow that writer yet.&rdquo;
            </blockquote>
            <p className="reveal reveal-delay-2" style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(.9rem, 2vw, 1.1rem)',
              color: 'rgba(255,255,255,.45)',
              lineHeight: 1.8, maxWidth: 600, margin: '0 auto',
            }}>
              You have 40 newsletters in your inbox and time for maybe 3. You skim.
              You miss. The ideas that would have changed your thinking go unread.
              Stacksome fixes this.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            FEATURES
            ════════════════════════════════════════════════════════════════ */}
        <section id="features" style={{ background: '#fff', padding: 'clamp(3rem, 6vw, 5.5rem) 2rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 6vw, 5rem)' }}>
              <p className="reveal" style={{
                fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#FF6719', marginBottom: '.75rem',
              }}>
                Features
              </p>
              <h2 className="reveal reveal-delay-1" style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: "'opsz' 72",
                fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
                fontWeight: 900, color: '#0A0A0A',
                lineHeight: 1.05, letterSpacing: '-.03em',
              }}>
                Not a feed.{' '}
                <span style={{ fontStyle: 'italic', color: '#FF6719' }}>A curriculum.</span>
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}>
              {[
                {
                  icon: '\uD83D\uDD2D',
                  title: 'Discovers writers you\u2019ve never read',
                  desc: '7 of your 10 weekly essays come from publications outside your current reading. Curated from 500+ Substack writers across every intellectual domain.',
                },
                {
                  icon: '\uD83C\uDFAF',
                  title: 'Matched to who you\u2019re becoming',
                  desc: 'Your profile captures your ambitions, not just your interests. Claude scores every post against it \u2014 the result is a list that pushes you forward.',
                },
                {
                  icon: '\u2728',
                  title: 'Gets sharper the more you read',
                  desc: 'Every upvote and downvote trains your taste. At 5, 10, and 20 upvotes, Claude rewrites your intellectual profile from scratch. It compounds.',
                },
                {
                  icon: '\uD83D\uDCDA',
                  title: 'Your stack, at its best',
                  desc: '3 of your weekly picks are from writers you already follow \u2014 but not just any posts. The most relevant ones to your current thinking.',
                },
              ].map((f, i) => (
                <div
                  key={f.title}
                  className={`reveal reveal-delay-${(i % 4) + 1}`}
                  style={{
                    padding: '2rem',
                    border: '1px solid #EEECEA',
                    borderRadius: 14,
                    background: i === 0 || i === 3 ? '#F8F8F6' : '#fff',
                    transition: 'border-color .2s, box-shadow .25s, transform .2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,103,25,.3)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,103,25,.08)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#EEECEA';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '1.1rem' }}>{f.icon}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontVariationSettings: "'opsz' 24",
                    fontSize: '1.15rem', fontWeight: 700,
                    color: '#0A0A0A', lineHeight: 1.3, marginBottom: '.6rem',
                  }}>
                    {f.title}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '.875rem', color: '#6B6B6B', lineHeight: 1.75 }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            COMPARISON — why not just read Substack?
            ════════════════════════════════════════════════════════════════ */}
        <section style={{ background: '#F8F8F6', padding: 'clamp(3rem, 6vw, 5.5rem) 2rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
              <p className="reveal" style={{
                fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#FF6719', marginBottom: '.75rem',
              }}>
                Why Stacksome
              </p>
              <h2 className="reveal reveal-delay-1" style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: "'opsz' 72",
                fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
                fontWeight: 900, color: '#0A0A0A',
                lineHeight: 1.05, letterSpacing: '-.03em',
              }}>
                Why not just{' '}
                <span style={{ fontStyle: 'italic', color: '#FF6719' }}>read Substack directly?</span>
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              maxWidth: 860, margin: '0 auto',
            }}
            className="comparison-grid"
            >
              {/* Without column */}
              <div className="reveal" style={{
                background: '#fff',
                border: '1px solid #EEECEA',
                borderRadius: 14,
                padding: '2.25rem 2rem',
              }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                  letterSpacing: '.12em', textTransform: 'uppercase',
                  color: '#BBB', marginBottom: '1.75rem',
                }}>
                  Without Stacksome
                </div>
                {[
                  '40+ newsletters fighting for your attention',
                  'You skim headlines, rarely finish anything',
                  'New writers invisible — you only see who you follow',
                  'No memory of what you read last month',
                  'Algorithm optimised for opens, not growth',
                  'You decide what to read based on subject lines',
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '.75rem',
                    marginBottom: '1rem',
                  }}>
                    <span style={{ color: '#DDD', fontSize: '.9rem', flexShrink: 0, marginTop: '.1rem' }}>✕</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '.875rem', color: '#999', lineHeight: 1.6 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* With column */}
              <div className="reveal reveal-delay-1" style={{
                background: '#0A0A0A',
                border: '1px solid #1E1E1E',
                borderRadius: 14,
                padding: '2.25rem 2rem',
              }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                  letterSpacing: '.12em', textTransform: 'uppercase',
                  color: '#FF6719', marginBottom: '1.75rem',
                }}>
                  With Stacksome
                </div>
                {[
                  '10 essays — exactly what fits in a focused week',
                  'Every post is pre-matched to your goals',
                  '7 fresh writers you\'ve never heard of, every week',
                  'Your reading history and taste profile compounds',
                  'Ranked by how much it challenges your thinking',
                  'You read based on intellectual fit, not headlines',
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '.75rem',
                    marginBottom: '1rem',
                  }}>
                    <span style={{ color: '#FF6719', fontSize: '.9rem', flexShrink: 0, marginTop: '.1rem' }}>✓</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '.875rem', color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            TESTIMONIALS
            ════════════════════════════════════════════════════════════════ */}
        <section style={{ background: '#fff', padding: 'clamp(3rem, 6vw, 5.5rem) 2rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <p className="reveal" style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.14em', textTransform: 'uppercase',
              color: '#FF6719', marginBottom: '3.5rem', textAlign: 'center',
            }}>
              What readers say
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {[
                {
                  text: 'I used to skim 40 newsletters and feel overwhelmed. Now I read 10 posts and feel like I actually learned something. The discovery section is what gets me every single week.',
                  name: 'Arjun M.',
                  role: 'Product Manager',
                  company: 'Early reader',
                  init: 'A',
                  stars: 5,
                },
                {
                  text: 'The discovery section introduced me to three writers I now read obsessively — none of whom I\'d ever have found on my own. That\'s the whole product right there.',
                  name: 'Kavya R.',
                  role: 'Product Designer',
                  company: 'Early reader',
                  init: 'K',
                  stars: 5,
                },
                {
                  text: 'It\'s like having a research assistant who read everything so you don\'t have to. I\'ve recommended it to my whole founding team. We start every Monday here.',
                  name: 'Mihir S.',
                  role: 'Co-founder',
                  company: 'Early reader',
                  init: 'M',
                  stars: 5,
                },
              ].map((q, i) => (
                <div
                  key={q.name}
                  className={`reveal reveal-delay-${i + 1}`}
                  style={{
                    background: '#F8F8F6',
                    border: '1px solid #EEECEA',
                    borderRadius: 14,
                    padding: '2rem',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '1.1rem' }}>
                    {Array.from({ length: q.stars }).map((_, si) => (
                      <span key={si} style={{ color: '#FF6719', fontSize: '.85rem' }}>★</span>
                    ))}
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontVariationSettings: "'opsz' 18",
                    fontSize: '.975rem', fontStyle: 'italic',
                    color: '#0A0A0A', lineHeight: 1.75,
                    marginBottom: '1.75rem', flexGrow: 1,
                  }}>
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FF6719, #FF8C4B)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: '1rem',
                      fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {q.init}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', color: '#0A0A0A', fontWeight: 600, lineHeight: 1.3 }}>
                        {q.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: '#999', marginTop: '.1rem' }}>
                        {q.role} · {q.company}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            FAQ
            ════════════════════════════════════════════════════════════════ */}
        <section id="faq" style={{ background: '#F8F8F6', padding: 'clamp(3rem, 6vw, 5.5rem) 2rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
              <p className="reveal" style={{
                fontFamily: 'var(--font-body)', fontSize: '.72rem', fontWeight: 700,
                letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#FF6719', marginBottom: '.75rem',
              }}>
                FAQ
              </p>
              <h2 className="reveal reveal-delay-1" style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: "'opsz' 72",
                fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)',
                fontWeight: 900, color: '#0A0A0A',
                lineHeight: 1.05, letterSpacing: '-.03em',
              }}>
                Questions, answered.
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="reveal"
                  style={{
                    background: '#fff',
                    border: '1px solid #EEECEA',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'box-shadow .2s',
                    boxShadow: openFaq === i ? '0 4px 20px rgba(0,0,0,.06)' : 'none',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1.3rem 1.5rem',
                      background: 'none', border: 'none', cursor: 'pointer',
                      gap: '1rem',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '.925rem', fontWeight: 600,
                      color: '#0A0A0A', lineHeight: 1.4,
                    }}>
                      {item.q}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '1.1rem',
                      color: '#FF6719', flexShrink: 0,
                      transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                      transition: 'transform .2s',
                      display: 'inline-block', lineHeight: 1,
                    }}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div style={{
                      padding: '0 1.5rem 1.4rem',
                      fontFamily: 'var(--font-body)', fontSize: '.875rem',
                      color: '#666', lineHeight: 1.8,
                    }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            FOUNDER CONTACT BAND
            ════════════════════════════════════════════════════════════════ */}
        <section style={{ background: '#fff', padding: 'clamp(3rem, 6vw, 5rem) 2rem', borderTop: '1px solid #EEECEA' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="reveal" style={{
              background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
              borderRadius: 20,
              padding: 'clamp(2.5rem, 5vw, 4rem) clamp(2rem, 4vw, 3.5rem)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '2.5rem',
              flexWrap: 'wrap',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Ambient orb */}
              <div style={{
                position: 'absolute', right: -80, top: -80,
                width: 320, height: 320,
                background: 'radial-gradient(circle, rgba(255,103,25,.18) 0%, transparent 65%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
                {/* Eyebrow */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                  fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.14em', textTransform: 'uppercase',
                  color: '#FF8C4B', marginBottom: '1rem',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6719', display: 'inline-block' }} />
                  just me here
                </div>

                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontVariationSettings: "'opsz' 48",
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  fontWeight: 900, color: '#fff',
                  lineHeight: 1.15, letterSpacing: '-.02em',
                  marginBottom: '.9rem',
                }}>
                  Honestly, just shoot me a message.
                </h3>

                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.9rem',
                  color: 'rgba(255,255,255,.5)', lineHeight: 1.8,
                }}>
                  I built this myself. No team, no support queue. If something&apos;s broken,
                  you hated a feature, or you just want to talk about reading — hit my inbox.
                  I reply to everything.
                </p>
              </div>

              {/* CTA block */}
              <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column', gap: '1rem',
                alignItems: 'flex-start', flexShrink: 0,
              }}>
                <a
                  href="mailto:atrijasrivathsa@gmail.com"
                  className="btn-glow"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.65rem',
                    background: '#FF6719', color: '#fff',
                    padding: '15px 30px', borderRadius: 10,
                    fontFamily: 'var(--font-body)', fontSize: '.95rem', fontWeight: 700,
                    textDecoration: 'none', letterSpacing: '.01em',
                    transition: 'opacity .15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  ✉&nbsp; Drop me a message
                </a>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '.75rem',
                  color: 'rgba(255,255,255,.3)', paddingLeft: '2px',
                }}>
                  atrijasrivathsa@gmail.com
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            FINAL CTA
            ════════════════════════════════════════════════════════════════ */}
        <section className="grain" style={{ background: '#0A0A0A', padding: 'clamp(5rem, 12vw, 10rem) 2rem', position: 'relative' }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>

            {/* Ambient glow behind CTA */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 600, height: 400,
              background: 'radial-gradient(ellipse at center, rgba(255,103,25,.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="reveal" style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: "'opsz' 144",
                fontSize: 'clamp(2rem, 5vw, 3.8rem)',
                fontWeight: 900, color: '#fff',
                lineHeight: .97, letterSpacing: '-.04em',
                marginBottom: '1.5rem',
              }}>
                Start reading<br />
                <span style={{ fontStyle: 'italic', color: '#FF6719' }}>smarter.</span>
              </h2>

              <p className="reveal reveal-delay-1" style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
                color: 'rgba(255,255,255,.5)',
                lineHeight: 1.8, maxWidth: 480,
                margin: '0 auto 2.5rem',
              }}>
                Free, forever. No credit card required. Your first curriculum
                is ready in under two minutes.
              </p>

              <div className="reveal reveal-delay-2">
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className="btn-glow"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.7rem',
                    background: '#FF6719', color: '#fff',
                    padding: '18px 42px', borderRadius: 12,
                    fontSize: '1.05rem', fontWeight: 700,
                    fontFamily: 'var(--font-body)',
                    border: 'none',
                    cursor: signingIn ? 'wait' : 'pointer',
                    letterSpacing: '.01em',
                  }}
                >
                  <GoogleIcon size={20} />
                  {signingIn ? 'Signing in\u2026' : 'Continue with Google \u2014 it\u2019s free'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            FOOTER
            ════════════════════════════════════════════════════════════════ */}
        <footer style={{
          background: '#0A0A0A',
          borderTop: '1px solid #1C1C1C',
          padding: 'clamp(3rem, 6vw, 5rem) 2rem 2rem',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* Top row — brand + columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '3rem',
              marginBottom: '3.5rem',
            }}
            className="footer-grid"
            >
              {/* Brand blurb */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontVariationSettings: "'opsz' 48",
                  fontSize: '1.7rem', fontWeight: 900,
                  color: '#fff', letterSpacing: '-.03em',
                  marginBottom: '.85rem',
                }}>
                  Stacksome
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.82rem',
                  color: 'rgba(255,255,255,.35)', lineHeight: 1.8,
                  maxWidth: 280, marginBottom: '1.25rem',
                }}>
                  Your personal Substack intelligence. 10 curated essays a week, matched to your intellectual ambitions.
                </p>
                <a
                  href="mailto:atrijasrivathsa@gmail.com"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                    fontFamily: 'var(--font-body)', fontSize: '.78rem',
                    color: 'rgba(255,255,255,.4)', textDecoration: 'none',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#FF6719'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
                >
                  ✉ atrijasrivathsa@gmail.com
                </a>
              </div>

              {/* Product links */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.12em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.3)', marginBottom: '1.25rem',
                }}>
                  Product
                </div>
                {[
                  { label: 'This Week', href: '/' },
                  { label: 'Search', href: '/search' },
                  { label: 'History', href: '/history' },
                  { label: 'Stats', href: '/stats' },
                  { label: 'Settings', href: '/settings' },
                ].map(l => (
                  <a key={l.href} href={l.href} style={{
                    display: 'block', marginBottom: '.6rem',
                    fontFamily: 'var(--font-body)', fontSize: '.82rem',
                    color: 'rgba(255,255,255,.4)', textDecoration: 'none',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.85)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              {/* Company links */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.12em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.3)', marginBottom: '1.25rem',
                }}>
                  Company
                </div>
                {[
                  { label: 'About', href: '/about' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Features', href: '#features' },
                  { label: 'FAQ', href: '#faq' },
                ].map(l => (
                  <a key={l.label} href={l.href} style={{
                    display: 'block', marginBottom: '.6rem',
                    fontFamily: 'var(--font-body)', fontSize: '.82rem',
                    color: 'rgba(255,255,255,.4)', textDecoration: 'none',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.85)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              {/* Contact */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.12em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.3)', marginBottom: '1.25rem',
                }}>
                  Contact
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '.82rem',
                  color: 'rgba(255,255,255,.35)', lineHeight: 1.8, marginBottom: '1rem',
                }}>
                  Feedback, ideas, or just want to say hi?
                </p>
                <a
                  href="mailto:atrijasrivathsa@gmail.com"
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px', borderRadius: 7,
                    border: '1px solid rgba(255,255,255,.12)',
                    fontFamily: 'var(--font-body)', fontSize: '.78rem', fontWeight: 600,
                    color: 'rgba(255,255,255,.6)', textDecoration: 'none',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,103,25,.5)'; e.currentTarget.style.color = '#FF6719'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
                >
                  Get in touch
                </a>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{
              borderTop: '1px solid #1C1C1C',
              paddingTop: '1.5rem',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '.75rem',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: 'rgba(255,255,255,.2)' }}>
                &copy; {year} Stacksome. All rights reserved.
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', color: 'rgba(255,255,255,.2)' }}>
                Powered by <span style={{ color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>At&amp;At</span>
              </span>
            </div>

          </div>
        </footer>

      </div>
    </>
  );
}
