import React, { useState } from 'react';

const logTypes = [
  { emoji: '🤖', label: 'AGENT', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)' },
  { emoji: '💬', label: 'GUEST', bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' },
  { emoji: '❌', label: 'ERROR', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
  { emoji: '⛈️', label: 'WEATHER', bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' },
  { emoji: '🔍', label: 'TOOL CALL', bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308', border: 'rgba(234, 179, 8, 0.25)' },
  { emoji: '📥', label: 'TOOL RETURN', bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.25)' },
  { emoji: '👉', label: 'DECISION', bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.25)' },
  { emoji: '✅', label: 'SUCCESS', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
  { emoji: '🛎️', label: 'PMS WEBHOOK', bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.25)' },
  { emoji: '🎒', label: 'INTEGRATION', bg: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.25)' },
  { emoji: 'ℹ️', label: 'INFO', bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' },
  { emoji: '🔄', label: 'SYSTEM', bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' },
];

function renderParsedLog(log, index) {
  let matched = null;
  for (const lt of logTypes) {
    if (log.startsWith(lt.emoji)) {
      matched = lt;
      break;
    }
  }

  const isCall = matched?.emoji === '🔍';
  const isRet = matched?.emoji === '📥';
  const isError = matched?.emoji === '❌';

  let logText = log;
  if (matched) {
    logText = log.substring(matched.emoji.length).trim();
  }

  return (
    <div 
      key={index} 
      className={`console-line ${isCall ? 'call' : (isRet ? 'ret' : (isError ? 'err' : ''))}`}
      style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '10px', 
        padding: '8px 8px', 
        borderRadius: '8px',
        fontSize: '0.82rem',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.4'
      }}
    >
      {matched && (
        <span 
          style={{ 
            background: matched.bg, 
            color: matched.color, 
            border: `1px solid ${matched.border}`, 
            padding: '4px 8px', 
            borderRadius: '8px', 
            fontSize: '0.68rem', 
            fontWeight: 700, 
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-block',
            flexShrink: 0,
            userSelect: 'none'
          }}
        >
          {matched.label}
        </span>
      )}
      <span style={{ flex: 1, marginTop: '1px' }}>{logText}</span>
    </div>
  );
}

export default function ControlPanel({ 
  logistics, 
  onSimulate, 
  onReset, 
  agentLogs, 
  loading 
}) {
  const [isProductionMode, setIsProductionMode] = useState(true);
  const [selectedWaveHeight, setSelectedWaveHeight] = useState(2.2);

  const sortedLogistics = logistics ? [...logistics].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWeather, setSelectedWeather] = useState('Heavy Rain');
  const [selectedAlert, setSelectedAlert] = useState('rain_warning');

  const hasRainAlert = logistics && logistics.some(l => l.alert !== 'none');
  const isConfirmed = agentLogs && agentLogs.some(log => log.includes('CONFIRMED') || log.includes('Booking updated') || log.includes('updated and slots shifted') || log.includes('Generated water taxi dispatch order'));
  const isDeclined = agentLogs && agentLogs.some(log => log.includes('DECLINED'));

  React.useEffect(() => {
    if (sortedLogistics.length > 0 && (!selectedDate || !sortedLogistics.some(l => l.date === selectedDate))) {
      setSelectedDate(sortedLogistics[0].date);
    }
  }, [logistics]);

  // Sync wave heights on weather selection
  React.useEffect(() => {
    if (selectedWeather === 'Heavy Rain') {
      setSelectedWaveHeight(2.2);
      setSelectedAlert('rain_warning');
    } else if (selectedWeather === 'Rainy') {
      setSelectedWaveHeight(1.2);
      setSelectedAlert('rain_warning');
    } else {
      setSelectedWaveHeight(0.6);
      setSelectedAlert('none');
    }
  }, [selectedWeather]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSimulate({
      date: selectedDate,
      weather: selectedWeather,
      alert: selectedAlert,
      wave_height: parseFloat(selectedWaveHeight)
    });
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          Operator Control Panel
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Configure operational data state rules and track automated coordination.
        </p>
      </div>

      {/* Operation Mode Toggle Switch */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '10px 14px',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-primary)' }}>Operation Mode</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3', marginTop: '2px' }}>
            {isProductionMode ? '🟢 Live IoT Feed: Streaming programmatic telemetry' : 'Sandbox mode for manual testing simulations'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.03)', flexShrink: 0 }}>
          <button 
            type="button"
            onClick={() => {
              setIsProductionMode(false);
            }}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: !isProductionMode ? 'var(--primary)' : 'transparent',
              color: !isProductionMode ? '#000' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Sandbox
          </button>
          <button 
            type="button"
            onClick={() => {
              setIsProductionMode(true);
              onReset(); // Reset to clear simulation overrides and fall back to live API
            }}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: isProductionMode ? '#10b981' : 'transparent',
              color: isProductionMode ? '#000' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Live IoT Feed
          </button>
        </div>
      </div>

      {isProductionMode ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.03)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-pulse" style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981'
            }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Telemetry Stream Active
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
            The system is actively connected to live programmatic feeds. Manual simulation triggers are bypassed in favor of real-world physical indices for Bocas del Toro coordinates (9.3403° N, 82.2420° W).
          </p>

          <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em' }}>ACTIVE API CHANNELS</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#10b981' }}>✓</span> OpenWeatherMap API <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>(Live Weather Code Stream)</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#10b981' }}>✓</span> Open-Meteo Marine API <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>(Real-time Reef Swells)</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.02)',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            💡 <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Autonomic Action</span>: A background cron worker automatically executes a telemetry poll check every 10 minutes. If rain warning codes or waves &gt; 1.5m are flagged on stay dates, Gemini launches instant rescheduling swap cards.
          </div>
          
          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => {
              onReset();
            }}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', background: '#10b981', border: 'none', color: '#000', fontSize: '0.8rem', fontWeight: 650, height: '36px' }}
          >
            {loading ? 'Polling Telemetry...' : 'Force Live API Poll Sync'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Date</label>
              <select 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: 'var(--slot-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.8s ease, color 0.5s ease'
                }}
              >
                {sortedLogistics.map(log => (
                  <option key={log.date} value={log.date}>{log.date}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather Forecast</label>
              <select 
                value={selectedWeather}
                onChange={(e) => setSelectedWeather(e.target.value)}
                style={{
                  background: 'var(--slot-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.8s ease, color 0.5s ease'
                }}
              >
                <option value="Sunny">Sunny</option>
                <option value="Rainy">Light Rain</option>
                <option value="Heavy Rain">Heavy Rain (Storm Warning)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather Alert Status</label>
              <select 
                value={selectedAlert}
                onChange={(e) => setSelectedAlert(e.target.value)}
                style={{
                  background: 'var(--slot-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.8s ease, color 0.5s ease'
                }}
              >
                <option value="none">None (Optimal Conditions)</option>
                <option value="rain_warning">Rain Warning (Trigger Replan)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wave Height: {selectedWaveHeight.toFixed(1)}m</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="range" 
                  min="0.2" 
                  max="3.0" 
                  step="0.1" 
                  value={selectedWaveHeight}
                  onChange={(e) => setSelectedWaveHeight(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)', height: '5px', cursor: 'pointer' }}
                />
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: selectedWaveHeight > 1.5 ? 'var(--error)' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {selectedWaveHeight > 1.5 ? '⚠️ High Waves' : '🟢 Safe Seas'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {loading ? 'Simulating...' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                      <polyline points="13 11 9 17 12 17 10 23" />
                    </svg>
                  </div>
                  Trigger Weather Shift
                </span>
              )}
            </button>
            
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onReset}
              disabled={loading}
              style={{ 
                borderColor: 'var(--error)', 
                color: 'var(--error)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <polyline points="3 3 3 8 8 8" />
                </svg>
              </div>
              Reset DB
            </button>
          </div>
        </form>
      )}

      <style>{`
        @keyframes pulse-dot {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
      `}</style>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Active Weather Board</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logistics && logistics.map((log) => (
            <div key={log.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--slot-empty-bg)', borderRadius: '8px', fontSize: '0.85rem', transition: 'background-color 0.8s ease' }}>
              <span style={{ color: 'var(--text-primary)' }}>{log.date}</span>
              <span style={{ 
                color: log.weather === 'Heavy Rain' ? 'var(--error)' : (log.weather === 'Rainy' ? 'var(--warning)' : 'var(--primary)'),
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {log.weather}
                {log.alert !== 'none' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🛡️ Real-World Agent Compliance & Safety Monitor */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          Real-World Compliance & Guardrails Monitor
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, fontWeight: 300 }}>
          Live audits of safety, double-booking prevention, and Human-in-the-Loop constraints.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {/* Item 1: Agent Execution State */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em' }}>Agent Brain Status</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: loading ? 'var(--primary)' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span className={loading ? "pulse-dot" : ""} style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: loading ? 'var(--primary)' : '#9ca3af',
                display: 'inline-block'
              }}></span>
              {loading ? 'Executing Replan...' : 'Monitoring Live Signals'}
            </span>
          </div>

          {/* Item 2: Weather Disruption Audit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em' }}>Weather Conflict</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: hasRainAlert ? 'var(--warning)' : 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {hasRainAlert ? '⛈️ Threat Detected' : '☀️ All Clear (Optimal)'}
            </span>
          </div>

          {/* Item 3: HITL Consent Guard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em' }}>Human-in-the-Loop Consent</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: loading ? 'var(--primary)' : (isConfirmed ? 'var(--primary)' : (isDeclined ? 'var(--error)' : (hasRainAlert ? 'var(--warning)' : 'var(--text-muted)'))),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {loading ? (
                '🔄 Evaluating alternative schedules...'
              ) : isConfirmed ? (
                '🟢 Approved & Booking Rescheduled'
              ) : isDeclined ? (
                '🔴 Proposal Declined by Guest'
              ) : hasRainAlert ? (
                '⚠️ Proposal Sent - Awaiting Consent'
              ) : (
                '🟢 Sync Active (No Conflict)'
              )}
            </span>
          </div>

          {/* Item 4: Captain & Provider Dispatch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em' }}>Excursion Provider Dispatch</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: isConfirmed ? 'var(--primary)' : (hasRainAlert ? 'var(--warning)' : 'var(--text-muted)'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {isConfirmed ? (
                '🟢 Boat Captain Notified via Dispatch'
              ) : hasRainAlert ? (
                '🟡 Dispatch Intercepted (Hold)'
              ) : (
                '🟢 Standby / Schedule Aligned'
              )}
            </span>
          </div>

          {/* Item 5: Double Booking Guard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em' }}>Institutional Safety Guard</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              🟢 Anti-Double-Booking Lock Enforced
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          Agent Execution Logs (MCP / Tool Calls)
        </h3>
        <div className="console-container">
          {agentLogs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              No execution events registered yet. Simulate a weather shift or chat with the agent to populate logs.
            </div>
          ) : (
            agentLogs.map((log, index) => renderParsedLog(log, index))
          )}
        </div>
      </div>
    </div>
  );
}
