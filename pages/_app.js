import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ToastProvider } from '../components/Toast';
import { AuthProvider } from '../components/AuthProvider';

function KeyboardShortcuts() {
  const router = useRouter();
  useEffect(() => {
    function handleKey(e) {
      // Press "/" anywhere (not in an input) → jump to search
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
        router.pathname !== '/search'
      ) {
        e.preventDefault();
        router.push('/search');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <KeyboardShortcuts />
        <Component {...pageProps} />
      </ToastProvider>
    </AuthProvider>
  );
}
