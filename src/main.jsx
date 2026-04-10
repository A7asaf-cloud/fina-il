import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// ── If no key is set, render a setup-instructions screen ─────────────────────
if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY.startsWith('pk_test_xxx')) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div dir="rtl" style={{
      minHeight: '100vh', background: '#020617', color: '#e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Heebo', Arial, sans-serif", padding: '2rem',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #f59e0b55',
        borderRadius: '1rem', padding: '2rem', maxWidth: '520px', width: '100%',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
        <h1 style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          נדרש הגדרת Clerk
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          כדי להפעיל את מערכת האיפוי, יש להכין <strong style={{ color: '#e2e8f0' }}>Publishable Key</strong> מ-Clerk:
        </p>
        <ol style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 2, paddingRight: '1.2rem' }}>
          <li>הירשם בחינם על <strong style={{ color: '#818cf8' }}>clerk.com</strong></li>
          <li>צור אפליקציה חדשה ← בחר Email + Social Logins</li>
          <li>בדשבורד: <em>Configure → API Keys</em></li>
          <li>העתק את <strong style={{ color: '#818cf8' }}>Publishable Key</strong></li>
          <li>פתח את קובץ <code style={{ background: '#1e293b', padding: '0 0.3rem', borderRadius: '4px' }}>.env</code> בתיקיית הפרויקט</li>
          <li>הדבק: <code style={{ background: '#1e293b', padding: '0 0.3rem', borderRadius: '4px' }}>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code></li>
          <li>שמור את הקובץ ורענן את הדפדפן</li>
        </ol>
      </div>
    </div>
  )
} else {
  // ── Normal startup with Clerk ─────────────────────────────────────────────
  const { ClerkProvider } = await import('@clerk/clerk-react')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  )
}
