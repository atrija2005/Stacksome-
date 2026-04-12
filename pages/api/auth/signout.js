import { createServerClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  const supabase = createServerClient(req, res);
  await supabase.auth.signOut();
  return res.redirect('/');
}
