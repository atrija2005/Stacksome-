import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastCtx = createContext(null);

const ICONS = { success: '✓', error: '✕', info: '·' };
const COLORS = {
  success: { bg: '#1c3a1e', border: '#2a6b2e', text: '#a8e6ac' },
  error:   { bg: '#3a1218', border: '#9b2335', text: '#f0a0a8' },
  info:    { bg: '#1c1a16', border: '#4a4238', text: '#c8bdb0' },
};

function ToastItem({ id, message, type = 'info', onDone }) {
  const [leaving, setLeaving] = useState(false);
  const col = COLORS[type] || COLORS.info;

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), 3200);
    const rm  = setTimeout(() => onDone(id), 3700);
    return () => { clearTimeout(out); clearTimeout(rm); };
  }, [id, onDone]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
      padding: '0.75rem 1rem',
      backgroundColor: col.bg,
      border: `1px solid ${col.border}`,
      marginBottom: '0.5rem',
      minWidth: '260px', maxWidth: '340px',
      animation: leaving ? 'toastOut 0.4s ease forwards' : 'toastIn 0.35s cubic-bezier(0.22,1,0.36,1) both',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
    }}>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: '0.7rem',
        color: col.text, flexShrink: 0, marginTop: '1px',
      }}>
        {ICONS[type]}
      </span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: '0.68rem',
        letterSpacing: '0.03em', lineHeight: '1.5', color: col.text,
      }}>
        {message}
      </span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Portal-style fixed container */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        zIndex: 9999, display: 'flex', flexDirection: 'column-reverse',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDone={remove} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
