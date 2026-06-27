import React, { useRef } from 'react';

const getBocasFallbackDates = () => {
  const dates = [];
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Panama',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayStr = formatter.format(d);
    // Support both YYYY-MM-DD and YYYY/MM/DD formats securely
    const parts = todayStr.split(/[-/]/).map(Number);
    const [yyyy, mm, dd] = parts;
    if (isNaN(yyyy) || isNaN(mm) || isNaN(dd)) {
      throw new Error("Parsed date values contain NaN; forcing safe native catch fallback.");
    }
    const baseDate = new Date(yyyy, mm - 1, dd, 12, 0, 0);
    for (let i = 0; i < 4; i++) {
      const nextD = new Date(baseDate);
      nextD.setDate(baseDate.getDate() + i);
      const y = nextD.getFullYear();
      const m = String(nextD.getMonth() + 1).padStart(2, '0');
      const day = String(nextD.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
  } catch (e) {
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const nextD = new Date(today);
      nextD.setDate(today.getDate() + i);
      const y = nextD.getFullYear();
      const m = String(nextD.getMonth() + 1).padStart(2, '0');
      const day = String(nextD.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
  }
  return dates;
};

export default function WeatherHorizon({ logistics, lang = 'en' }) {
  const scrollContainerRef = useRef(null);

  const safeLogistics = (logistics || []).filter(l => l && typeof l.date === 'string');
  const dates = safeLogistics.length > 0
    ? [...safeLogistics].sort((a, b) => a.date.localeCompare(b.date))
    : getBocasFallbackDates().map(d => ({
        date: d,
        weather: "Sunny",
        alert: "none",
        wave_height: 0.6,
        wave_status: "safe"
      }));

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const formatDate = (dateStr) => {
    try {
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      const date = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
      return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options);
    } catch (e) {
      return dateStr;
    }
  };

  const labels = {
    en: {
      title: "Live Bocas Weather Horizon",
      subtitle: "Real-time swells and weather dispatches from our reef sensors.",
      today: "TODAY",
      day: "Day",
      reefSwell: "Reef Swell",
      safe: "SAFE",
      hazardous: "HAZARDOUS",
      swellHeight: "Swell Height",
      alert: "ALERT:",
      rainWarning: "Rain Warning"
    },
    es: {
      title: "Horizonte del Clima de Bocas",
      subtitle: "Oleajes en tiempo real y reportes de nuestros sensores de arrecife.",
      today: "HOY",
      day: "Día",
      reefSwell: "Swell del Arrecife",
      safe: "SEGURO",
      hazardous: "PELIGROSO",
      swellHeight: "Altura de Swell",
      alert: "ALERTA:",
      rainWarning: "Aviso de Lluvia"
    }
  };

  const currentL = labels[lang] || labels.en;

  const getWeatherVisuals = (weather) => {
    switch (weather) {
      case 'Heavy Rain':
        return {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6366f1' }}>
              <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
              <polyline points="13 11 9 17 12 17 10 23" />
            </svg>
          ),
          bg: 'rgba(99, 102, 241, 0.03)',
          border: 'rgba(99, 102, 241, 0.15)',
          label: lang === 'es' ? 'Alerta de Tormenta' : 'Storm Alert',
          displayWeather: lang === 'es' ? 'Tormenta' : 'Heavy Rain',
          temp: '26°C / 79°F',
          textColor: '#4f46e5'
        };
      case 'Rainy':
        return {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}>
              <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
              <path d="M16 13v8M8 13v8M12 15v8" />
            </svg>
          ),
          bg: 'rgba(59, 130, 246, 0.05)',
          border: 'rgba(59, 130, 246, 0.2)',
          label: lang === 'es' ? 'Lluvia Tropical' : 'Tropical Rain',
          displayWeather: lang === 'es' ? 'Lluvioso' : 'Rainy',
          temp: '27°C / 81°F',
          textColor: '#2563eb'
        };
      case 'Cloudy':
        return {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
              <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-3.5-3.5-3.5-3.5-.13-2.95-2.68-6-5.5-6-3.25 0-5.38 3.5-5.38 3.5C6.62 9.5 3 11 3 14c0 3 2.5 5 5.5 5" />
            </svg>
          ),
          bg: 'rgba(148, 163, 184, 0.05)',
          border: 'rgba(148, 163, 184, 0.2)',
          label: lang === 'es' ? 'Nublado / Cubierto' : 'Overcast',
          displayWeather: lang === 'es' ? 'Nublado' : 'Cloudy',
          temp: '29°C / 84°F',
          textColor: '#475569'
        };
      case 'Sunny':
      default:
        return {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#b45309' }}>
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ),
          bg: 'rgba(212, 175, 55, 0.04)',
          border: 'rgba(212, 175, 55, 0.15)',
          label: lang === 'es' ? 'Paraíso Perfecto' : 'Perfect Paradise',
          displayWeather: lang === 'es' ? 'Soleado' : 'Sunny',
          temp: '31°C / 88°F',
          textColor: '#b45309'
        };
    }
  };

  return (
    <div className="glass-card" style={{ padding: '20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-serif)', letterSpacing: '0.01em', margin: 0 }}>
            {currentL.title}
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 300 }}>
            {currentL.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => scroll('left')}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-card-nested, rgba(0,0,0,0.03))',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.background = 'var(--primary-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.background = 'var(--bg-card-nested, rgba(0,0,0,0.03))';
            }}
          >
            ‹
          </button>
          <button 
            onClick={() => scroll('right')}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-card-nested, rgba(0,0,0,0.03))',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.background = 'var(--primary-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.background = 'var(--bg-card-nested, rgba(0,0,0,0.03))';
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          paddingBottom: '4px',
          scrollbarWidth: 'none', // Firefox
          WebkitOverflowScrolling: 'touch'
        }}
        className="hide-scrollbar"
      >
        {dates.map((day, idx) => {
          const visuals = getWeatherVisuals(day.weather);
          const isWarning = day.weather === 'Heavy Rain' || day.weather === 'Rainy';
          const waveHeight = typeof day.wave_height === 'number' ? day.wave_height : 0.6;
          const isDangerWave = waveHeight > 1.5;

          return (
            <div 
              key={day.date}
              style={{
                flex: '0 0 200px',
                background: isWarning ? visuals.bg : 'var(--slot-bg)',
                border: `1px solid ${isWarning ? visuals.border : 'var(--border-color)'}`,
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = isWarning ? visuals.border : 'var(--border-color)'}
            >
              {idx === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  background: 'var(--primary)',
                  color: 'var(--primary-btn-text, #000)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  letterSpacing: '0.04em'
                }}>
                  {currentL.today}
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(day.date)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {currentL.day} {idx + 1}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 700, 
                  color: visuals.textColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {visuals.displayWeather}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {visuals.temp}
                </div>
              </div>

              {/* Reef Sensor Wave Height Status */}
              <div style={{
                background: 'var(--bg-card-nested, rgba(0,0,0,0.03))',
                borderRadius: '8px',
                padding: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{currentL.reefSwell}</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: isDangerWave ? '#d97706' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: isDangerWave ? '#d97706' : '#059669' }}></span>
                    {isDangerWave ? currentL.hazardous : currentL.safe}
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                  {waveHeight.toFixed(1)}m {currentL.swellHeight}
                </div>
              </div>

              {/* Alert Message Box */}
              {day.alert && day.alert !== 'none' && (
                <div style={{
                  fontSize: '0.68rem',
                  lineHeight: '1.3',
                  background: visuals.bg === 'rgba(212, 175, 55, 0.04)' ? 'rgba(212, 175, 55, 0.08)' : visuals.bg,
                  border: `1px solid ${visuals.border}`,
                  color: visuals.textColor,
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontWeight: 700 }}>{currentL.alert}</span> {day.alert === 'rain_warning' ? currentL.rainWarning : day.alert}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
