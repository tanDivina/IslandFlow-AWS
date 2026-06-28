import React, { useState, useEffect, useRef } from 'react';

export default function ChatWidget({ 
  messages = [], 
  onSendMessage, 
  onRespondProposal, 
  loading,
  bookings = [],
  tenantBrand,
  tours = [],
  logistics = []
}) {
  const [input, setInput] = useState('');
  const [selectedAlternativeId, setSelectedAlternativeId] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const timer = setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, loading]);

  useEffect(() => {
    if (tours && tours.length > 0) {
      const bookedTourIds = bookings ? bookings.map(b => b.tour_id) : [];
      const indoor = tours.filter(t => t.type === 'indoor' && !bookedTourIds.includes(t._id));
      if (indoor.length > 0) {
        setSelectedAlternativeId(prev => {
          if (prev && indoor.some(t => t._id === prev)) {
            return prev;
          }
          return indoor[0]._id;
        });
      } else {
        setSelectedAlternativeId('');
      }
    } else {
      setSelectedAlternativeId('');
    }
  }, [tours, bookings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput('');
  };

  const isProposalMessage = (msgText) => {
    if (!msgText) return false;
    const lower = msgText.toLowerCase();
    // Exclude cases where the swap/reschedule action has already been successfully executed or confirmed
    const isConfirmation = 
      lower.includes('success') || 
      lower.includes('completed') || 
      lower.includes('applied') || 
      lower.includes('confirmed') || 
      lower.includes('has been swapped') || 
      lower.includes('has been rescheduled') ||
      lower.includes('keep original') ||
      lower.includes('kept original') ||
      lower.includes('keeping original') ||
      lower.includes('already swapped') ||
      lower.includes('already rescheduled');

    if (isConfirmation) {
      return false;
    }
    return lower.includes('reschedule') || lower.includes('swap') || lower.includes('alternative') || lower.includes('propose');
  };

  const parseMessageText = (text) => {
    if (!text) return '';
    // Strip background guest context
    let cleanText = text.replace(/\[Guest Context:.*?\]\n/g, '');
    
    // Split by markdown bold format and render segments accordingly
    const parts = cleanText.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 650, color: 'var(--primary)' }}>{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="glass-card chat-widget-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--chat-header-bg)' }}>
        <div style={{ position: 'relative' }}>
          <img 
            src="/concierge_avatar.png" 
            alt="Bocas Concierge Avatar" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', display: 'block' }}
          />
          <span style={{ 
            position: 'absolute', 
            bottom: '0', 
            right: '0', 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: 'hsl(188, 55%, 38%)', 
            border: '2px solid var(--bg-color)',
            boxShadow: 'none'
          }}></span>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.01em' }}>Bocas Eco-Concierge</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--primary)' }}>
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            Local Butler Dispatch Active
          </div>
        </div>
        
        {/* Urgent Front Desk Emergency Calling Button */}
        <a 
          href="tel:+50766554433" 
          title="Call Front Desk for Emergency Assistance"
          style={{
            marginLeft: 'auto',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            color: '#dc2626',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.16)';
            e.currentTarget.style.borderColor = '#b91c1c';
            e.currentTarget.style.color = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.25)';
            e.currentTarget.style.color = '#dc2626';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Front Desk
        </a>

        {/* Product Feedback Button */}
        <button 
          onClick={() => {
            const feedback = prompt("Please share your feedback on this AI experience:");
            if (feedback) {
              alert("Thank you for your feedback! It has been logged.");
              console.log("Feedback received:", feedback);
            }
          }}
          title="Share Feedback on this AI Experience"
          style={{
            background: 'var(--primary-glow)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--primary-glow)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Feedback
        </button>
      </div>

      {/* Messages area with scroll isolation & anchoring */}
      <div 
        ref={containerRef}
        className="soft-edge-fade-y"
        style={{ 
          flex: 1, 
          padding: '20px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          overscrollBehavior: 'contain',
          overflowAnchor: 'none'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            {/* Elegant Welcome Palm Tree SVG */}
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
              <path d="M12 22c1-4 1-8 0-12" />
              <path d="M5 22c2-.5 12-.5 14 0" />
              <path d="M12 10c-3-2-7-1-9 2" />
              <path d="M12 10c3-2 7-1 9 2" />
              <path d="M12 10c-4 .5-8 3-9 7" />
              <path d="M12 10c4 .5 8 3 9 7" />
              <path d="M12 10c-1.5-4-5-6-8-6" />
              <path d="M12 10c1.5-4 5-6 8-6" />
            </svg>
            <div>
              <div style={{ fontWeight: 500, fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}>Welcome to Paradise</div>
              <p style={{ fontSize: '0.85rem', maxWidth: '320px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '6px', fontWeight: 300 }}>
                {tenantBrand?.welcome_message || "I am your private island coordinator, my friend. Speak with me at any time to adjust schedules, manage excursions, or request weather replans."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isProposal = !isUser && index === messages.length - 1 && isProposalMessage(msg.text);
            const outdoorBookings = bookings.filter(b => b.status === 'confirmed');
            
            // Resolve the rainy day and find the matching target booking precisely
            const rainyDates = logistics ? logistics.filter(l => l.alert === 'rain_warning' || l.weather === 'Rainy' || l.weather === 'Heavy Rain').map(l => l.date) : [];
            const targetBooking = outdoorBookings.find(b => rainyDates.includes(b.date)) || outdoorBookings[0];
            
            const showProposalCard = isProposal && targetBooking;

            // Filter out any activities the guest has already booked during their stay
            const bookedTourIds = bookings ? bookings.map(b => b.tour_id) : [];
            const indoorTours = tours ? tours.filter(t => t.type === 'indoor' && !bookedTourIds.includes(t._id)) : [];
            const selectedTour = tours ? tours.find(t => t._id === selectedAlternativeId) : null;

            return (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '82%' }}>
                  <div 
                    style={{ 
                      background: isUser ? 'var(--msg-user-bg)' : 'var(--msg-agent-bg)',
                      border: isUser ? '1px solid hsla(38, 45%, 60%, 0.25)' : '1px solid var(--border-color)',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '14px 18px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
                    }}
                  >
                    {parseMessageText(msg.text)}
                  </div>

                  {showProposalCard && (
                    <div 
                      className="glass-card" 
                      style={{ 
                        padding: '16px', 
                        background: 'hsla(35, 80%, 55%, 0.05)',
                        border: '1px solid var(--warning)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 8px 24px rgba(245, 158, 11, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.02em' }}>
                        {/* Weather Alert SVG Line Icon - 18px size, stroke 1.5px, bound 24px */}
                        <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                            <polyline points="13 11 9 17 12 17 10 23" />
                          </svg>
                        </div>
                        Weather Replan Dispatch
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', fontWeight: 300 }}>
                        We detected a logistical weather risk. Approve the proposal below to instantly swap this excursion for an available, covered substitute.
                      </div>

                      {indoorTours.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.01em' }}>
                            Select Preferred Covered Excursion:
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {indoorTours.map(t => {
                              const isSelected = selectedAlternativeId === t._id;
                              return (
                                <button
                                  key={t._id}
                                  type="button"
                                  onClick={() => setSelectedAlternativeId(t._id)}
                                  style={{
                                    textAlign: 'left',
                                    background: isSelected ? 'hsla(35, 80%, 55%, 0.12)' : 'rgba(255,255,255,0.02)',
                                    border: isSelected ? '1.5px solid var(--warning)' : '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                    boxShadow: isSelected ? '0 4px 12px rgba(245, 158, 11, 0.12)' : 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                      e.currentTarget.style.borderColor = 'var(--border-color)';
                                    }
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                    <span style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      border: isSelected ? '4px solid var(--warning)' : '1.5px solid var(--text-muted)',
                                      display: 'inline-block',
                                      boxSizing: 'border-box',
                                      transition: 'all 0.2s ease',
                                      flexShrink: 0
                                    }}></span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                      <span style={{ fontWeight: isSelected ? 600 : 400, fontSize: '0.82rem', color: isSelected ? 'var(--warning)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {t.name}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        📍 {t.location}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.78rem', 
                                    fontWeight: 600, 
                                    color: isSelected ? 'var(--warning)' : 'var(--text-muted)',
                                    background: isSelected ? 'hsla(35, 80%, 55%, 0.15)' : 'rgba(255,255,255,0.04)',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    flexShrink: 0
                                  }}>
                                    ${t.price}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedTour && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-muted)', 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          lineHeight: '1.4'
                        }}>
                          <div style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Info Icon - 18px size, stroke 1.5px, bound 24px */}
                            <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                            </div>
                            Activity Description & Details
                          </div>
                          <div>{selectedTour.description}</div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <button 
                          className="btn-primary" 
                          onClick={() => {
                            onRespondProposal(targetBooking._id, targetBooking.date, selectedAlternativeId || (indoorTours[0]?._id || 't4'), true);
                          }}
                          style={{ 
                            flex: 1, 
                            padding: '12px 16px', 
                            fontSize: '0.8rem',
                            background: 'var(--primary)',
                            boxShadow: 'none',
                            color: 'var(--primary-btn-text, #0f172a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {/* Confirm Swap Icon - 18px size, stroke 1.5px, bound 24px */}
                          <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          Confirm Swap
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => onRespondProposal(targetBooking._id, targetBooking.date, null, false)}
                          style={{ 
                            flex: 1, 
                            padding: '12px 16px', 
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Keep Original
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <div style={{ 
              background: 'var(--msg-agent-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              {/* Elegant Chat Bubble SVG Line Icon - 18px size, stroke 1.5px, bound 24px */}
              <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="dot-typing" style={{ paddingRight: '16px' }}>Butler is planning</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar - No readOnly constraint to prevent keyboard layout shifts */}
      <form onSubmit={handleSubmit} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', background: 'var(--chat-footer-bg)' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Butler is arranging..." : "Request activity adjustments..."}
          style={{
            flex: 1,
            background: 'var(--slot-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '12px 16px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s ease, opacity 0.2s ease',
            fontFamily: 'var(--font-sans)',
            fontWeight: 300
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={!input.trim() || loading}
          style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {/* Send Icon - 18px size, stroke 1.5px, bound 24px */}
          <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          Send
        </button>
      </form>
    </div>
  );
}
