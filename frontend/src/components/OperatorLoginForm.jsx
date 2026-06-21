import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function OperatorLoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e, directEmail = null) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = directEmail || email;
    const targetPassword = directEmail ? 'admin' : password;

    if (!targetEmail) {
      setError('Please enter your hotel operator email.');
      setLoading(false);
      return;
    }
    if (!targetPassword) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/operator/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (data.status === 'success') {
        onLoginSuccess(data.hotel_id, data.hotel_name);
      } else {
        setError('Unexpected server response');
      }
    } catch (err) {
      console.error('Operator login error:', err);
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const DEMO_HOTELS = [
    { id: 'hotel_nayara', name: 'Nayara Bocas del Toro', email: 'nayara@hotel.com', color: '#3ecdc6' },
    { id: 'hotel_sweetbocas', name: 'Sweet Bocas', email: 'sweetbocas@hotel.com', color: '#f97316' },
    { id: 'hotel_lacoralina', name: 'La Coralina Island House', email: 'lacoralina@hotel.com', color: '#a855f7' },
    { id: 'hotel_redfrog', name: 'Red Frog Beach Resort', email: 'redfrog@hotel.com', color: '#ef4444' },
    { id: 'hotel_bocasvillas', name: 'Bocas Luxury Villas', email: 'bocasvillas@hotel.com', color: '#3b82f6' },
  ];

  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      background: 'linear-gradient(135deg, hsla(210, 32%, 11%, 0.55), hsla(210, 32%, 7%, 0.55))',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(62, 205, 198, 0.1)',
          border: '1px solid rgba(62, 205, 198, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 0 20px rgba(62, 205, 198, 0.15)'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3ecdc6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" height="18" width="18" y="3" rx="2" />
            <path d="M9 17v-5h6v5" />
            <path d="M8 21h8" />
            <path d="M12 3v3" />
          </svg>
        </div>
        <h2 style={{
          fontSize: '1.6rem',
          fontWeight: 700,
          background: 'linear-gradient(to right, #ffffff, #c2d6ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          Hotel Operator Console
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Secure tenant gateway for luxury resort dispatchers
        </p>
      </div>

      {/* Main Login Form */}
      <form onSubmit={(e) => handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="email-input" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Operator Email
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@resort.com"
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3ecdc6';
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.boxShadow = '0 0 10px rgba(62, 205, 198, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.target.style.background = 'rgba(255, 255, 255, 0.03)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="password-input" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Secret Password
          </label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3ecdc6';
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.boxShadow = '0 0 10px rgba(62, 205, 198, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.target.style.background = 'rgba(255, 255, 255, 0.03)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #3ecdc6, #25a49e)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            color: '#080c14',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(62, 205, 198, 0.25)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '4px'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(62, 205, 198, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(62, 205, 198, 0.25)';
            }
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.2)" />
                <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In Securely</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.06)' }}></div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Or 1-Tap Demo Switcher
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.06)' }}></div>
      </div>

      {/* 1-Tap Demo Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 4px 0' }}>
          Evaluators can bypass the password gate and test database isolation by clicking any resort below:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DEMO_HOTELS.map((hotel) => (
            <button
              key={hotel.id}
              type="button"
              onClick={() => handleLogin(null, hotel.email)}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: `1px solid rgba(255, 255, 255, 0.06)`,
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = hotel.color;
                  e.currentTarget.style.boxShadow = `0 0 12px ${hotel.color}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: hotel.color,
                  boxShadow: `0 0 8px ${hotel.color}`
                }}></span>
                <span>{hotel.name}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {hotel.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
