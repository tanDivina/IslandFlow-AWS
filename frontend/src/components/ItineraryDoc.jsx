import React from 'react';

export default function ItineraryDoc({ itineraryMarkdown, guestId = "g1" }) {
  React.useEffect(() => {
    if (itineraryMarkdown && window.pendo) {
      try {
        window.pendo.track("View Itinerary", {
          guest_id: guestId,
          length: itineraryMarkdown.length
        });
      } catch (e) {
        console.error("Pendo track error:", e);
      }
    }
  }, [itineraryMarkdown, guestId]);
  const renderMarkdown = (md) => {
    if (!md) {
      return (
        <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
          Your official travel receipt will appear here. Ask your concierge in the chat to book activities, or confirm a rescheduled activity swap to generate your updated itinerary receipt.
        </div>
      );
    }

    const lines = md.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 700, margin: '20px 0 12px 0', borderBottom: '2px solid var(--primary)', paddingBottom: '6px', color: '#0f172a' }}>{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} style={{ fontSize: '1.1rem', fontWeight: 600, margin: '16px 0 8px 0', color: 'var(--primary)' }}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} style={{ fontWeight: 600, margin: '8px 0', color: '#0f172a' }}>{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ')) {
        const text = line.replace('- ', '');
        const boldMatch = text.match(/\*\*(.*?)\*\*/g);
        let renderedText = text;
        if (boldMatch) {
          boldMatch.forEach(m => {
            const clean = m.replace(/\*\*/g, '');
            renderedText = renderedText.replace(m, `<strong>${clean}</strong>`);
          });
        }
        return (
          <div 
            key={index} 
            style={{ marginLeft: '12px', paddingLeft: '8px', borderLeft: '2px solid #cbd5e1', margin: '8px 0', fontSize: '0.88rem' }}
            dangerouslySetInnerHTML={{ __html: renderedText }}
          />
        );
      }
      if (line.startsWith('---')) {
        return <hr key={index} style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '20px 0' }} />;
      }
      if (line.trim() === '') {
        return <div key={index} style={{ height: '8px' }} />;
      }
      
      let renderedLine = line;
      const boldMatch = line.match(/\*\*(.*?)\*\*/g);
      if (boldMatch) {
        boldMatch.forEach(m => {
          const clean = m.replace(/\*\*/g, '');
          renderedLine = renderedLine.replace(m, `<strong>${clean}</strong>`);
        });
      }
      return (
        <p 
          key={index} 
          style={{ fontSize: '0.9rem', color: '#334155', margin: '4px 0' }}
          dangerouslySetInnerHTML={{ __html: renderedLine }}
        />
      );
    });
  };

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'hsl(222, 47%, 9%)', minHeight: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          Generated Document View
        </h2>
        {itineraryMarkdown && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="btn-secondary" 
              onClick={() => window.print()} 
              style={{ 
                padding: '8px 12px', 
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              Print Itinerary
            </button>
          </div>
        )}
      </div>

      <div style={{ 
        background: 'white', 
        color: '#1e293b', 
        padding: '32px', 
        borderRadius: '8px', 
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        maxHeight: '450px',
        lineHeight: '1.6'
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          strong { font-weight: 600; color: #0f172a; }
        `}} />
        {renderMarkdown(itineraryMarkdown)}
        {itineraryMarkdown && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '32px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0f172b&data=${encodeURIComponent(window.location.origin + '?view=guest&guest_id=' + guestId)}`} 
              alt="Scan QR Code to save on phone" 
              style={{ width: '120px', height: '120px' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>
              Scan to save itinerary for guest '{guestId}' to your phone
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
