import React from 'react';

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

export default function ScheduleView({ bookings = [], tours = [], logistics = [], guestId, lang = 'en' }) {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeTours = Array.isArray(tours) ? tours : [];
  const safeLogistics = Array.isArray(logistics) ? logistics : [];

  const filteredLogistics = safeLogistics.filter(l => l && typeof l.date === 'string');
  const dates = filteredLogistics.length > 0
    ? [...filteredLogistics].sort((a, b) => a.date.localeCompare(b.date)).map(l => l.date)
    : getBocasFallbackDates();

  // Fallback for browsers without native CSS scroll timelines support (e.g. Firefox)
  const [supportsScrollTimeline, setSupportsScrollTimeline] = React.useState(true);

  React.useEffect(() => {
    const supported = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline: view()');
    setSupportsScrollTimeline(supported);

    if (!supported) {
      let observer;
      const timer = setTimeout(() => {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
              } else {
                entry.target.classList.remove('reveal-visible');
              }
            });
          },
          {
            threshold: 0.05,
            rootMargin: '0px 0px -10% 0px',
          }
        );

        const items = document.querySelectorAll('.scroll-reveal-fallback');
        items.forEach((item) => observer.observe(item));
      }, 100);

      return () => {
        clearTimeout(timer);
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [safeLogistics, guestId]);

  // Filter bookings strictly by the active guestId to ensure one guest's timeline 
  // never leaks onto another's under any view, loading phase, or condition
  const activeBookings = safeBookings.filter(
    b => b.guest_id && guestId && String(b.guest_id) === String(guestId)
  );

  const getBookingForSlot = (date, slot) => {
    const booking = activeBookings.find(b => b.date === date && b.slot === slot);
    if (!booking) return null;
    
    const tour = safeTours.find(t => t._id === booking.tour_id);
    return {
      ...booking,
      tour
    };
  };

  const getWeatherForDate = (date) => {
    const log = safeLogistics.find(l => l.date === date);
    return log ? { weather: log.weather, alert: log.alert } : { weather: 'Sunny', alert: 'none' };
  };

  const labels = {
    en: {
      title: "Stay Activity Timeline",
      subtitle: "Your verified stay timeline is fully prepared and up to date.",
      day: "Day",
      stormWarning: "Storm Warning!",
      rainForecasted: "Rain Forecasted",
      morning: "Morning",
      afternoon: "Afternoon",
      unscheduled: "Unscheduled Slot",
      loadingTour: "Loading tour..."
    },
    es: {
      title: "Línea de Actividades",
      subtitle: "Su itinerario verificado de estadía está preparado y al día.",
      day: "Día",
      stormWarning: "¡Alerta de Tormenta!",
      rainForecasted: "Lluvia Pronosticada",
      morning: "Mañana",
      afternoon: "Tarde",
      unscheduled: "Espacio Libre",
      loadingTour: "Cargando tour..."
    }
  };

  const currentL = labels[lang] || labels.en;

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}>
          {/* Custom SVG Palm Island Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c1-4 1-8 0-12" />
              <path d="M5 22c2-.5 12-.5 14 0" />
              <path d="M12 10c-3-2-7-1-9 2" />
              <path d="M12 10c3-2 7-1 9 2" />
              <path d="M12 10c-4 .5-8 3-9 7" />
              <path d="M12 10c4 .5 8 3 9 7" />
              <path d="M12 10c-1.5-4-5-6-8-6" />
              <path d="M12 10c1.5-4 5-6 8-6" />
            </svg>
          </div>
          {currentL.title}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 300 }}>
          {currentL.subtitle}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {dates.map((date) => {
          const { weather, alert } = getWeatherForDate(date);
          const hasRainAlert = alert !== 'none';
          const isHeavyRain = weather === 'Heavy Rain';

          return (
            <div 
              key={date} 
              className={`${supportsScrollTimeline ? 'scroll-reveal-item' : 'scroll-reveal-fallback'} timeline-day-card ${hasRainAlert ? (isHeavyRain ? 'weather-heavy-rain' : 'weather-warning') : ''}`}
              style={{ 
                background: 'var(--slot-bg)', 
                borderRadius: '12px', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative'
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, letterSpacing: '0.01em' }}>{date}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 300 }}>
                    {currentL.day} {dates.indexOf(date) + 1}
                  </div>
                </div>
                <div 
                  title={`Weather: ${weather}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: hasRainAlert ? 'var(--warning)' : 'var(--primary)'
                  }}
                >
                  {/* Fine Line SVG Weather Icons */}
                  {isHeavyRain ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                        <polyline points="13 11 9 17 12 17 10 23" />
                      </svg>
                    </div>
                  ) : (weather === 'Rainy' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                        <path d="M16 13v8M8 13v8M12 15v8" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Weather Warning Header */}
              {hasRainAlert && (
                <div style={{ 
                  background: isHeavyRain ? 'var(--error-glow)' : 'var(--warning-glow)', 
                  border: `1px solid ${isHeavyRain ? 'var(--error)' : 'var(--warning)'}`,
                  color: isHeavyRain ? 'var(--error)' : 'var(--warning)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  {isHeavyRain ? currentL.stormWarning : currentL.rainForecasted}
                </div>
              )}

              {/* Slots */}
              {[currentL.morning, currentL.afternoon].map((slotName, sIdx) => {
                const slotKey = sIdx === 0 ? "morning" : "afternoon";
                const slotData = getBookingForSlot(date, slotKey);
                
                return (
                  <div key={slotKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>
                      {slotName}
                    </div>
                    {slotData ? (
                      <div 
                        className={`timeline-slot-card ${slotData.tour?.type === 'indoor' ? 'slot-indoor' : 'slot-outdoor'}`}
                        style={{ 
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.25' }}>
                            {slotData.tour?.name || currentL.loadingTour}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}>
                          {/* Map Pin SVG Vector */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </div>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {slotData.tour?.location}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)' }}>
                            ${slotData.price}
                          </span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '4px 8px', 
                            borderRadius: '8px',
                            background: slotData.status === 'confirmed' ? 'var(--accent-glow)' : 'var(--warning-glow)',
                            color: slotData.status === 'confirmed' ? 'var(--accent)' : 'var(--warning)',
                            border: `1px solid ${slotData.status === 'confirmed' ? 'var(--accent)' : 'var(--warning)'}`,
                            fontWeight: 600,
                            letterSpacing: '0.05em'
                          }}>
                            {slotData.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="timeline-unscheduled-slot"
                        style={{ 
                          background: 'var(--slot-empty-bg)', 
                          borderRadius: '12px',
                          padding: '12px 8px',
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                          fontStyle: 'italic',
                          textAlign: 'center',
                          fontWeight: 300
                        }}
                      >
                        {currentL.unscheduled}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
