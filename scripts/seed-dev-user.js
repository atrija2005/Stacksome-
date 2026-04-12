/**
 * Creates the dev bypass user in Supabase auth.users so the
 * DEV_AUTH_BYPASS flow can insert publications / posts without
 * hitting a foreign-key violation.
 *
 * Run once:  node scripts/seed-dev-user.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const DEV_USER_ID    = '00000000-0000-0000-0000-000000000001';
const DEV_USER_EMAIL = 'dev@stacksome.local';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log('Checking for existing dev user…');

  // Try to fetch the user first
  const { data: existing } = await supabase.auth.admin.getUserById(DEV_USER_ID);
  if (existing?.user) {
    console.log('✅ Dev user already exists:', existing.user.id);
    return;
  }

  console.log('Creating dev user…');
  const { data, error } = await supabase.auth.admin.createUser({
    user_metadata: {},
    email:         DEV_USER_EMAIL,
    password:      'dev-password-not-used',
    email_confirm: true,
    // Force the specific UUID so it matches DEV_USER_ID in lib/auth.js
    id: DEV_USER_ID,
  });

  if (error) {
    console.error('❌ Failed to create dev user:', error.message);
    process.exit(1);
  }

  console.log('✅ Dev user created:', data.user.id);
  console.log('   Email:', data.user.email);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
