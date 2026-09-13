import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// ─── Loading spinner shown during lazy page chunk loading ─────────────────────
const PageLoader = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 16,
    background: '#f8fafc',
    zIndex: 9999
  }}>
    <div style={{
      width: 48,
      height: 48,
      border: '4px solid #e2e8f0',
      borderTopColor: '#2563eb',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite'
    }} />
    <p style={{ color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
      Loading EtherBallot…
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <App />
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4500,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9rem',
            },
            success: {
              iconTheme: { primary: '#059669', secondary: '#ffffff' },
              style: { borderLeft: '4px solid #059669' }
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
              style: { borderLeft: '4px solid #dc2626' }
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
