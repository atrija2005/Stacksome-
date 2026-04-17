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
            Stacksome is a deep-dive reading engine built on Substack. Tell it exactly what you want to understand — a sector, a preparation goal, a thesis — and it builds a focused curriculum from across thousands of newsletters, hand-picked by Claude to cover every critical angle.
          </p>

          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: C.muted, lineHeight: 1.75, fontStyle: 'italic' }}>
            Not a feed. Not an algorithm. A curator that takes your goal seriously and refuses to waste your time with anything that doesn't directly serve it.
          </p>
        </div>

        <Rule color={C.red} />

        {/* ── The Problem ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a', marginBottom: '1rem' }}>
            Who this is for
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8, marginBottom: '1rem' }}>
            Stacksome is built for the person who needs to go all the way in. The analyst prepping for a PE internship who needs to walk into a first-round interview knowing the sector cold. The founder writing a thesis before entering a new market. The student who won't stop at the surface.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8, marginBottom: '1rem' }}>
            These people don't have time to skim 40 newsletters and hope the right essay shows up. They need a curriculum — a deliberate set of reads that covers every angle, from overview to contrarian, and gets them to genuine fluency fast.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8 }}>
            That's what Stacksome builds. You state your goal. Claude finds the best posts from across Substack and structures them into a curriculum. You read them in order and come out the other side knowing something real.
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
            title="State your goal precisely"
            body="Not just a topic — a goal. 'Prep for PE internship in FinTech.' 'Sector thesis on climate infrastructure.' 'Deep dive on LLM infrastructure before a board meeting.' The more specific, the sharper the curriculum."
          />
          <HowStep
            step="02"
            title="Choose your depth"
            body="Quick Read gives you 5 posts ordered foundation to depth — good for orientation. Deep Dive gives you 7 posts, one per critical angle: Overview, Business Model, Key Players, Bear Case, Consensus, Contrarian, Edge. Built for serious preparation."
          />
          <HowStep
            step="03"
            title="Claude searches across Substack"
            body="Stacksome live-fetches posts from thousands of Substack publications matched to your goal — writers you've never heard of, covering angles you haven't considered. The pool is wide; the selection is ruthless."
          />
          <HowStep
            step="04"
            title="Claude builds your curriculum"
            body="Claude reads your goal, your past signals, and the full pool of discovered posts — then selects exactly 5. Every post is directly on-topic. They're ordered as a reading path: post 1 gives you the foundation, post 5 goes deepest. No filler, no tangents."
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
            title="A curriculum is not a reading list"
            body="A reading list is a collection. A curriculum has a destination. Every post in a Stacksome curriculum is there because it serves a specific function in your path to understanding — not because it's vaguely related or recently popular."
          />
          <Principle
            number="II"
            color={C.orange}
            title="Depth beats breadth"
            body="Five posts that genuinely advance your understanding of one topic are worth more than twenty loosely related links. Every curriculum is a focused reading path — not a collection. You finish it knowing something you didn't before."
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

        {/* ── The curriculum ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a', marginBottom: '1rem' }}>
            What a curriculum looks like
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '.95rem', color: '#444', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Every curriculum is 5 posts, ordered as a deliberate reading path toward your stated goal.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[
              { n: '01', label: 'Foundation', color: C.red, desc: 'The best entry point for your goal. Gives you the mental model everything else builds on.' },
              { n: '02–04', label: 'Development', color: C.orange, desc: 'Posts that deepen, challenge, and expand the foundation. Each one assumes you\'ve read the last.' },
              { n: '05', label: 'Depth', color: C.blue, desc: 'The most specific, rigorous post in the set. By post 5 you\'re reading at a level you couldn\'t have started at.' },
            ].map(x => (
              <div key={x.label} style={{ display: 'flex', gap: '1.25rem', padding: '1.1rem 1.4rem', border: `1px solid #e8e4de`, borderLeft: `3px solid ${x.color}`, background: '#fff' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '.65rem', letterSpacing: '.1em', color: x.color, fontWeight: 700, flexShrink: 0, paddingTop: '2px' }}>
                  {x.n}
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '.6rem', letterSpacing: '.15em', textTransform: 'uppercase', color: C.muted, marginBottom: '.35rem' }}>
                    {x.label}
                  </div>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '.88rem', color: '#555', lineHeight: 1.65, margin: 0 }}>
                    {x.desc}
                  </p>
                </div>
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
