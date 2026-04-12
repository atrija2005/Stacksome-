import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext(null);

function tryCreateClient() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const { createBrowserClient } = require('../lib/supabase');
    return createBrowserClient();
  } catch {
    return null;
  }
}

const DEV_USER = { id: '00000000-0000-0000-0000-000000000001', email: 'dev@stacksome.local', dev: true };

export function AuthProvider({ children }) {
  const router = useRouter();
  const supabase = useMemo(() => tryCreateClient(), []);

  // In dev bypass mode, immediately set a fake user — no Supabase session needed
  const isDevBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
  const [user, setUser]       = useState(isDevBypass ? DEV_USER : null);
  const [loading, setLoading] = useState(!isDevBypass);

  useEffect(() => {
    // Dev bypass: already have a fake user, nothing to do
    if (isDevBypass) return;
    if (!supabase) { setLoading(false); return; }

    // Safety net — never hang longer than 3s
    const timeout = setTimeout(() => setLoading(false), 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, isDevBypass]);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) console.error('[Auth] Google sign-in error:', error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }

  const configured = !!supabase;

  return (
    <AuthContext.Provider value={{ user, loading, supabase, signInWithGoogle, signOut, configured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
