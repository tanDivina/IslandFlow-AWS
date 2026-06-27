import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.search = '';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          margin: '40px auto',
          maxWidth: '650px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1.5px solid var(--border-color, rgba(255,255,255,0.08))',
          borderRadius: '16px',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-primary, #f1f5f9)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-glow, rgba(212, 175, 55, 0.08))',
            border: '1.5px solid var(--primary, hsl(45, 60%, 55%))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary, hsl(45, 60%, 55%))',
            marginBottom: '16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--primary, hsl(45, 60%, 55%))', fontFamily: 'var(--font-serif, serif)' }}>
            Portal Sandbox Restored
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
            The active panel encountered a state exception or network discrepancy. Rain or Shine has intercepted the crash to keep the browser thread alive.
          </p>
          
          {this.state.error && (
            <div style={{
              textAlign: 'left',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontFamily: 'monospace',
              color: '#ef4444',
              maxHeight: '200px',
              overflowY: 'auto',
              marginBottom: '24px',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.4'
            }}>
              <strong>Exception:</strong> {this.state.error.toString()}
              {this.state.errorInfo && (
                <div style={{ marginTop: '8px', color: 'var(--text-dim, #6b7280)' }}>
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                background: 'var(--primary, hsl(45, 60%, 55%))',
                color: 'var(--primary-btn-text, #0f172a)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Reset view to home
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                color: 'var(--text-muted, #9ca3af)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Hard reload browser
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
