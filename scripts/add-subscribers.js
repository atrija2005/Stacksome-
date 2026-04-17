/**
 * Run once: creates the subscribers table in Supabase.
 * Usage: node scripts/add-subscribers.js
 * Requires SUPABASE_DB_URL in .env (Project Settings → Database → Connection string)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS subscribers (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  interests         TEXT NOT NULL DEFAULT '',
  unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_at      TIMESTAMPTZ,
  active            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
CREATE INDEX IF NOT EXISTS idx_subscribers_token  ON subscribers(unsubscribe_token);

ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;
`;

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('SUPABASE_DB_URL not set in .env');
    console.error('Find it at: Supabase Dashboard → Project Settings → Database → Connection string (URI)');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected. Running migration...');
  await client.query(SQL);
  console.log('✓ subscribers table ready');
  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
