import Layout from '../components/Layout';

const C = { red: '#cc0000', orange: '#e87000', blue: '#0050c8', muted: '#767676', rule: '#e8e4de' };

function Rule({ color }) {
  return <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)`, margin: '2.5rem 0' }} />;
}

function Principle({ number, title, body, color }) {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 900,
        color: color, lineHeight: 1, flexShrink: 0, opacity: 0.25, width: '2.5rem', textAlign: 'right',
      }}>
        {number}
      </div>
      <div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: '#0a0a0a', margin: '0 0 .4rem' }}>
          {title}
        </h3>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '.92rem', color: '#444', lineHeight: 1.75, margin: 0 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function HowStep({ step, title, body }) {
  return (
    <div style={{
      display: 'flex', gap: '1rem', padding: '1.25rem 1.5rem',
      border: '1px solid #e8e4de', marginBottom: '.75rem', background: '#fff',
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: '.62rem', letterSpacing: '.12em',
        textTransform: 'uppercase', color: '#fff', background: '#0a0a0a',
        padding: '4px 10px', alignSelf: 'flex-start', flexShrink: 0, marginTop: '3px',
      }}>
        {step}
      </div>
      <div>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#0a0a0a', margin: '0 0 .3rem' }}>
          {title}
        </p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '.85rem', color: C.muted, lineHeight: 1.65, margin: 0 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <Layout>

      {/* ── Hero ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: '4rem' }}>

        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem' }}>
            <div style={{ width: 28, height: 4, background: C.red }} />
            <div style={{ width: 28, height: 4, background: C.orange }} />
            <div style={{ width: 28, height: 4, background: C.blue }} />
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 900, lineHeight: 1.1,
            fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', color: '#0a0a0a', marginBottom: '1rem',
          }}>
            What is Stacksome?
          </h1>

          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#333', lineHeight: 1.8, marginBottom: '1.25rem',
          }}>
            Stacksome is a personal reading intelligence for Substack. Every week, it finds the best posts across thousands of newsletters — not just the ones you already follow — and curates a 10-post reading list built specifically around who you are and who you want to become.
          </p>

          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: C.muted, lineHeight: 1.75, fontStyle: 'italic' }}>
            It's not a feed. It's not an algorithm. It's a curator that knows your intellectual ambitions and refuses to waste your time.
          </p>
        </div>

        <Rule color={C.red} />

        {/* ── The Problem ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a', marginBottom: '1rem' }}>
            The problem with reading today
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8, marginBottom: '1rem' }}>
            Substack has thousands of brilliant writers. But you only find them by accident — a retweet, a recommendation from a friend, a rabbit hole at 1am. Most great writing never reaches the people who would most benefit from it.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8, marginBottom: '1rem' }}>
            And even if you subscribe to good newsletters, your inbox becomes noise. You read the same takes from the same circles, reinforcing what you already believe. The adjacent field that would sharpen your thinking never appears.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8 }}>
            Stacksome fixes this by doing the discovery for you — and doing it in a way that's tuned to your actual intellectual goals, not your engagement history.
          </p>
        </div>

        <Rule color={C.orange} />

        {/* ── How it works ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a', marginBottom: '1.5rem' }}>
            How it works
          </h2>

          <HowStep
            step="01"
            title="You describe yourself"
            body="Write a short profile of your interests, what you're building, and what kind of thinking you want more of. Speak it if you'd rather — there's a voice input. This profile is the foundation everything else is built on."
          />
          <HowStep
            step="02"
            title="You add references"
            body="Add Substack publications you already love and trust. These aren't sources to recommend from — they calibrate taste. Claude reads them to understand your intellectual level and preferences, then uses that to find better things from sources you've never seen."
          />
          <HowStep
            step="03"
            title="Discovery happens automatically"
            body="Every time you generate a list, Stacksome live-fetches recent posts from 16+ curated Substack publications matched to your profile. These are writers you've probably never heard of — but whose thinking aligns with yours."
          />
          <HowStep
            step="04"
            title="Claude curates 10 posts for you"
            body="Claude reads your profile, your references, your past signals, and the full pool of discovered posts — then selects exactly 10. Seven on-profile, two adjacent to stretch your thinking, one completely outside your world to create productive discomfort."
          />
          <HowStep
            step="05"
            title="Your taste gets smarter over time"
            body="Every upvote and downvote is a signal. After you've rated enough posts, Claude automatically rewrites your interest profile to reflect what you actually engage with — not just what you said you liked."
          />
        </div>

        <Rule color={C.blue} />

        {/* ── Principles ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a', marginBottom: '2rem' }}>
            What we believe
          </h2>

          <Principle
            number="I"
            color={C.red}
            title="Reading should build character, not fill time"
            body="Every post on your list should be there because it sharpens a specific quality — your judgment, your systems thinking, your tolerance for complexity. If it's just interesting, it doesn't make the cut."
          />
          <Principle
            number="II"
            color={C.orange}
            title="The best ideas are outside your bubble"
            body="Twenty percent of your reading should be adjacent to your interests, and ten percent should be completely foreign to it. Productive discomfort is how genuine insight happens. Stacksome builds this in by design — not by accident."
          />
          <Principle
            number="III"
            color={C.blue}
            title="Discovery should be automatic, not manual"
            body="You shouldn't have to hunt for good writers. The curation should do the hunting. Stacksome finds publications you've never heard of, fetches their latest posts live, and lets Claude decide if they belong in your week."
          />
          <Principle
            number="IV"
            color="#555"
            title="Your signals matter — and should feed back"
            body="What you upvote, skip, and read tells a story about what you actually value. That story should be used to refine what you see next. Every interaction makes the next list more accurate."
          />
        </div>

        <Rule color="#e8e4de" />

        {/* ── The 70/20/10 ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a', marginBottom: '1rem' }}>
            The 70 / 20 / 10 curriculum
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Every generated list follows this structure — inspired by how the best professional development works.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { pct: '70%', label: 'Core', color: C.red, desc: 'Directly on your profile. First-principles thinking, rigorous analysis, contrarian takes in your domain.' },
              { pct: '20%', label: 'Adjacent', color: C.orange, desc: 'Same intellectual neighbourhood, different angle. Keeps your thinking from calcifying.' },
              { pct: '10%', label: 'Wild', color: C.blue, desc: 'Completely different field. Maximum productive discomfort. The thing you never knew you needed.' },
            ].map(x => (
              <div key={x.label} style={{ flex: '1 1 180px', padding: '1.25rem', border: `2px solid ${x.color}`, background: '#fff' }}>
                <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: '2.5rem', fontWeight: 900, color: x.color, lineHeight: 1 }}>
                  {x.pct}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '.6rem', letterSpacing: '.15em', textTransform: 'uppercase', color: C.muted, margin: '.4rem 0 .75rem' }}>
                  {x.label}
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '.82rem', color: '#555', lineHeight: 1.65, margin: 0 }}>
                  {x.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Rule color="#e8e4de" />

        {/* ── Footer note ── */}
        <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '.65rem', letterSpacing: '.15em', textTransform: 'uppercase', color: C.muted }}>
            Built for serious readers &nbsp;·&nbsp; Powered by At&amp;At &nbsp;·&nbsp; Substack-only
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.9rem', color: '#aaa', fontStyle: 'italic', marginTop: '.5rem' }}>
            Read · Reflect · Become
          </p>
        </div>

      </div>
    </Layout>
  );
}
