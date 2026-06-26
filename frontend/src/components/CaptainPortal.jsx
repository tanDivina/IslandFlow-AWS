import React, { useState, useEffect } from 'react';
import WeatherHorizon from './WeatherHorizon';

const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://islandflow-aws-162640897083.us-central1.run.app');

export default function CaptainPortal({ captainId, logistics, lang = 'en', setLang, onBackToLanding }) {
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real-time weather condition report state
  const [conditions, setConditions] = useState({
    sea_state: 'calm',
    visibility: 'clear',
    rain: 'none',
    notes: ''
  });
  const [submittingConditions, setSubmittingConditions] = useState(false);
  const [conditionsMessage, setConditionsMessage] = useState(null);

  // Status submission state
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  });
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = {
    en: {
      bocasOperator: 'Bocas Marine Operator',
      commandPortal: "Captain's Command Portal",
      exitDashboard: 'Exit Dashboard',
      weatherHorizon: 'Weather Horizon',
      liveAlerts: 'Live alerts synced with front desk',
      todaysManifest: "Today's Manifest",
      syncData: 'Sync Data',
      retrieving: 'Retrieving assigned trips...',
      noTours: 'No active tours assigned to you today.',
      reachOut: 'Reach out to the hotel front desk to get dispatch coordinates.',
      guestName: 'Guest Name',
      pickupDock: 'Pickup Dock',
      totalPax: 'Total Pax',
      persons: 'Persons',
      assigned: 'Assigned',
      confirmed: 'Confirmed',
      enRoute: 'En Route',
      delayed: 'Delayed',
      unsafeConditions: 'Unsafe Conditions',
      completed: 'Completed',
      notesLabel: 'Add Radio/Status Notes (Optional):',
      notesPlaceholder: "e.g., '10-minute delay due to rain' or 'Sea calm, departure set'",
      confirmTrip: 'Confirm Trip',
      enRouteBtn: 'En Route',
      reportDelay: 'Report Delay',
      flagUnsafe: 'Flag Unsafe',
      completeTour: 'Complete Tour',
      cancelUpdate: 'Cancel Update',
      updateRadioStatus: 'Update Radio Status / Dispatch Info',
      liveSafetyReport: 'Live Safety / Sea Condition Report',
      liveSafetyDesc: 'Submit real-time reports from the channel to update hotel dispatches instantly.',
      seaSwellState: 'Sea Swell State',
      calm: 'Calm (0.0 - 0.5m)',
      moderate: 'Moderate (0.5 - 1.2m)',
      rough: 'Rough (1.2m+)',
      visibility: 'Visibility',
      clear: 'Excellent / Clear',
      modVisibility: 'Moderate / Haze',
      poorVisibility: 'Poor / Squall',
      precipitation: 'Precipitation',
      noneRain: 'Clear / Sunny',
      lightRain: 'Light Rain',
      heavyRain: 'Heavy Squall',
      waterNotes: 'On-the-Water Observational Notes',
      waterNotesPlaceholder: "e.g., 'Heavy rain squalls coming from the east. Advise indoor activities or postponing snorkeling routes until 2 PM.'",
      logSeaReport: 'Log Sea Condition Report',
      broadcasting: 'Broadcasting Marine Report...',
      safetySuccess: 'Marine safety report logged and synchronized.',
      safetyError: 'Failed to submit marine report.',
      statusSuccess: 'Status successfully updated!',
      statusError: 'Failed to broadcast status update to hotel/guest.',
      failedRetrieve: 'Failed to retrieve manifest',
      apiOffline: 'Could not connect to backend server. Make sure the API is online.',
      failedUpdate: 'Failed to update status',
      failedSubmitConditions: 'Failed to submit conditions'
    },
    es: {
      bocasOperator: 'Operador Marino de Bocas',
      commandPortal: 'Portal de Mando del Capitán',
      exitDashboard: 'Salir del Panel',
      weatherHorizon: 'Horizonte del Clima',
      liveAlerts: 'Alertas en vivo sincronizadas con recepción',
      todaysManifest: 'Manifiesto de Hoy',
      syncData: 'Sincronizar Datos',
      retrieving: 'Recuperando viajes asignados...',
      noTours: 'No tienes tours activos asignados hoy.',
      reachOut: 'Comunícate con la recepción del hotel para obtener coordenadas de despacho.',
      guestName: 'Nombre del Huésped',
      pickupDock: 'Muelle de Embarque',
      totalPax: 'Pasajeros Totales',
      persons: 'Personas',
      assigned: 'Asignado',
      confirmed: 'Confirmado',
      enRoute: 'En Ruta',
      delayed: 'Demorado',
      unsafeConditions: 'Condiciones Inseguras',
      completed: 'Completado',
      notesLabel: 'Agregar notas de radio/estado (Opcional):',
      notesPlaceholder: "ej. 'Retraso de 10 min por lluvia' o 'Mar calmo, salida lista'",
      confirmTrip: 'Confirmar Viaje',
      enRouteBtn: 'En Ruta',
      reportDelay: 'Reportar Retraso',
      flagUnsafe: 'Reportar Inseguro',
      completeTour: 'Completar Tour',
      cancelUpdate: 'Cancelar Actualización',
      updateRadioStatus: 'Actualizar Estado de Radio / Despacho',
      liveSafetyReport: 'Reporte de Seguridad y Clima Marino en Vivo',
      liveSafetyDesc: 'Envía reportes en tiempo real desde el canal para actualizar los despachos del hotel al instante.',
      seaSwellState: 'Estado de la Marea (Swell)',
      calm: 'Calmo (0.0 - 0.5m)',
      moderate: 'Moderado (0.5 - 1.2m)',
      rough: 'Agitado (1.2m+)',
      visibility: 'Visibilidad',
      clear: 'Excelente / Despejado',
      modVisibility: 'Moderada / Neblina',
      poorVisibility: 'Mala / Chubasco',
      precipitation: 'Precipitación',
      noneRain: 'Despejado / Soleado',
      lightRain: 'Lluvia Ligera',
      heavyRain: 'Chubasco Fuerte',
      waterNotes: 'Notas de Observación en el Agua',
      waterNotesPlaceholder: "ej. 'Fuertes chubascos del este. Recomendar actividades bajo techo o posponer snorkel hasta las 2 PM.'",
      logSeaReport: 'Registrar Reporte Marino',
      broadcasting: 'Transmitiendo Reporte Marino...',
      safetySuccess: 'Reporte de seguridad marina registrado y sincronizado.',
      safetyError: 'Error al enviar reporte marino.',
      statusSuccess: '¡Estado actualizado exitosamente!',
      statusError: 'Error al transmitir actualización de estado al hotel/huésped.',
      failedRetrieve: 'Error al recuperar el manifiesto',
      apiOffline: 'No se pudo conectar al servidor backend. Asegúrese de que la API esté activa.',
      failedUpdate: 'Error al actualizar el estado',
      failedSubmitConditions: 'Error al enviar condiciones'
    }
  };

  const currentT = t[lang];

  // Fetch Manifest
  const fetchManifest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/captain/manifest/${captainId}`);
      if (!res.ok) throw new Error(currentT.failedRetrieve);
      const data = await res.ok ? await res.json() : [];
      setManifest(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(currentT.apiOffline);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (captainId) {
      fetchManifest();
    }
  }, [captainId, lang]);

  // Submit Booking Status
  const handleUpdateStatus = async (bookingId, status) => {
    try {
      setSubmittingStatus(true);
      setStatusMessage(null);
      const res = await fetch(`${API_BASE}/api/captain/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          status,
          notes: statusNotes
        })
      });
      if (!res.ok) throw new Error(currentT.failedUpdate);
      
      setStatusMessage({ type: 'success', text: `${currentT.statusSuccess} (${status.toUpperCase()})` });
      setStatusNotes('');
      setActiveBookingId(null);
      
      // Refresh manifest
      await fetchManifest();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: currentT.statusError });
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Submit Conditions Report
  const handleReportConditions = async (e) => {
    e.preventDefault();
    try {
      setSubmittingConditions(true);
      setConditionsMessage(null);
      const res = await fetch(`${API_BASE}/api/captain/report-conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captain_id: captainId,
          ...conditions
        })
      });
      if (!res.ok) throw new Error(currentT.failedSubmitConditions);
      
      setConditionsMessage({ type: 'success', text: currentT.safetySuccess });
      setConditions(prev => ({ ...prev, notes: '' }));
    } catch (err) {
      console.error(err);
      setConditionsMessage({ type: 'error', text: currentT.safetyError });
    } finally {
      setSubmittingConditions(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'confirmed': return '#22c55e'; // green
      case 'en-route': return '#0ea5e9'; // blue
      case 'delayed': return '#f59e0b'; // orange
      case 'unsafe-conditions': return '#ef4444'; // red
      case 'completed': return '#a855f7'; // purple
      default: return '#64748b'; // slate
    }
  };

  const getStatusBadgeText = (status) => {
    switch (status) {
      case 'assigned': return currentT.assigned;
      case 'confirmed': return currentT.confirmed;
      case 'en-route': return currentT.enRoute;
      case 'delayed': return currentT.delayed;
      case 'unsafe-conditions': return currentT.unsafeConditions;
      case 'completed': return currentT.completed;
      default: return status;
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px)) 16px',
      color: 'var(--text-primary)',
      fontFamily: 'Outfit, Poppins, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '2px',
              color: '#3ecdc6',
              fontWeight: '600'
            }}>{currentT.bocasOperator}</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '20px',
              background: isOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
              fontSize: '10px',
              fontWeight: '600',
              color: isOnline ? '#22c55e' : '#f59e0b'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isOnline ? '#22c55e' : '#f59e0b',
                boxShadow: isOnline ? '0 0 6px #22c55e' : '0 0 6px #f59e0b'
              }} />
              {isOnline ? (lang === 'es' ? 'EN LÍNEA' : 'ONLINE') : (lang === 'es' ? 'SIN CONEXIÓN' : 'OFFLINE')}
            </span>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: '4px 0 0 0',
            color: 'var(--text-primary)'
          }}>{currentT.commandPortal}</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Premium EN/ES Toggle Slider */}
          <div 
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            style={{
              background: 'var(--bg-card-nested, rgba(15, 23, 42, 0.15))',
              border: '1px solid var(--border-color)',
              borderRadius: '24px',
              padding: '3px',
              display: 'inline-flex',
              alignItems: 'center',
              position: 'relative',
              width: '120px',
              height: '32px',
              flexShrink: 0,
              cursor: 'pointer',
              userSelect: 'none',
              backdropFilter: 'blur(8px)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {/* Sliding indicator */}
            <div 
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                bottom: '3px',
                width: 'calc(50% - 3px)',
                background: 'var(--primary)',
                borderRadius: '20px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: lang === 'en' ? 'translateX(0)' : 'translateX(100%)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                zIndex: 1
              }}
            />
            
            {/* English label */}
            <span style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.72rem',
              fontWeight: '700',
              color: lang === 'en' ? 'var(--primary-btn-text, #ffffff)' : 'var(--text-muted)',
              zIndex: 2,
              transition: 'color 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}>
              🇬🇧 EN
            </span>

            {/* Spanish label */}
            <span style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.72rem',
              fontWeight: '700',
              color: lang === 'es' ? 'var(--primary-btn-text, #ffffff)' : 'var(--text-muted)',
              zIndex: 2,
              transition: 'color 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}>
              🇪🇸 ES
            </span>
          </div>

          {!isStandalone && (
            <button 
              onClick={onBackToLanding}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px 16px',
                color: '#f8fafc',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {currentT.exitDashboard}
            </button>
          )}
        </div>
      </div>

      {/* Premium PWA Installation & Onboarding Guide */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        {isStandalone ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              <span className="pulse-dot" style={{ position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(16, 185, 129, 0.4)' }}></span>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {lang === 'es' ? 'Aplicación Móvil Sincronizada (Modo Offline Activado)' : 'Mobile Marine Dispatch App Synced (Offline Mode Enabled)'}
            </span>
            <style>{`
              @keyframes pulse {
                0% { transform: scale(0.65); opacity: 1; }
                100% { transform: scale(1.4); opacity: 0; }
              }
              .pulse-dot {
                animation: pulse 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
              }
            `}</style>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 450px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-serif)', letterSpacing: '0.01em', margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', color: 'var(--primary)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </div>
                  {lang === 'es' ? 'Instalación de Aplicación del Capitán' : 'Mobile Dispatch App Installation'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '6px 0 16px 0', lineHeight: '1.4', fontWeight: 300 }}>
                  {lang === 'es' 
                    ? 'Lleve su portal de despacho a los muelles como una aplicación nativa. Funciona sin internet para que pueda consultar itinerarios y reportar estados en tiempo real directamente en el mar.' 
                    : 'Take your dispatch portal to the docks as a native-quality app. It works offline so you can consult schedules and report status dispatches instantly while on the water.'}
                </p>

                {/* Show install button if native prompt is supported */}
                {deferredPrompt && (
                  <button
                    onClick={async () => {
                      if (!deferredPrompt) return;
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setDeferredPrompt(null);
                      }
                    }}
                    style={{
                      background: 'var(--primary)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {lang === 'es' ? 'Instalar en este Dispositivo' : 'Install on this Device'}
                  </button>
                )}

                {/* Guide Instructions Accordion / Block */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      iPhone (Safari)
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '14px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li>{lang === 'es' ? 'Toque el botón "Compartir" (Share)' : 'Tap the "Share" button'}</li>
                      <li>{lang === 'es' ? 'Seleccione "Agregar a inicio" (Add to Home Screen)' : 'Select "Add to Home Screen"'}</li>
                      <li>{lang === 'es' ? 'Inicie desde su pantalla de inicio' : 'Launch it directly from your dock'}</li>
                    </ol>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                      Android (Chrome)
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '14px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li>{lang === 'es' ? 'Toque el menú de los 3 puntos' : 'Tap the 3-dot menu button'}</li>
                      <li>{lang === 'es' ? 'Seleccione "Instalar Aplicación" o "Agregar"' : 'Select "Install app" or "Add to Home"'}</li>
                      <li>{lang === 'es' ? '¡Y listo! Ya tiene su app de despacho' : 'Access offline dispatches instantly'}</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* QR Code / Share section (adaptive) */}
              {isMobile ? (
                <div style={{
                  flex: '1 1 240px',
                  background: 'rgba(62, 205, 198, 0.04)',
                  border: '1px solid rgba(62, 205, 198, 0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>📱</span>
                    <div style={{ textAlign: 'left' }}>
                      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#3ecdc6' }}>
                        {lang === 'es' ? 'Acceso Directo Activado' : 'Direct Mobile Access'}
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                        {lang === 'es' 
                          ? 'Ya está en su celular. Siga las instrucciones para añadir a la pantalla de inicio.' 
                          : 'You are already on your phone. Follow the guidelines below to install.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/?view=captain&captain_id=${captainId}`;
                        navigator.clipboard.writeText(link);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        flex: 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {copiedLink ? (lang === 'es' ? '¡Copiado!' : 'Copied!') : (lang === 'es' ? 'Copiar Enlace' : 'Copy Link')}
                    </button>

                    <button
                      onClick={async () => {
                        const link = `${window.location.origin}/?view=captain&captain_id=${captainId}`;
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: lang === 'es' ? 'Mi Portal de Capitán' : 'My Captain Portal',
                              text: lang === 'es' ? 'Accede a mi itinerario de hoy en IslandFlow.' : 'Access my tour dispatcher schedule on IslandFlow.',
                              url: link
                            });
                          } catch (err) {
                            console.log('Share error:', err);
                          }
                        } else {
                          // Fallback WhatsApp share
                          const text = encodeURIComponent((lang === 'es' ? 'Mi Portal de Capitán: ' : 'My Captain Portal: ') + link);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }
                      }}
                      style={{
                        background: 'rgba(62, 205, 198, 0.15)',
                        border: '1px solid rgba(62, 205, 198, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#3ecdc6',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        flex: 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      {lang === 'es' ? 'Compartir' : 'Share'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: '0 0 160px',
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '8px'
                }}>
                  <div style={{ 
                    width: '136px', 
                    height: '136px', 
                    background: '#ffffff', 
                    borderRadius: '8px', 
                    padding: '6px', 
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=090d16&data=${encodeURIComponent(window.location.origin + '/?view=captain&captain_id=' + captainId)}`}
                      alt="Scan QR to Install" 
                      style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: '1.2' }}>
                    {lang === 'es' ? 'Escanear con Celular' : 'Scan to Install on Phone'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weather Strip */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: '#94a3b8' }}>{currentT.weatherHorizon}</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{currentT.liveAlerts}</span>
        </div>
        <WeatherHorizon logistics={logistics} lang={lang} />
      </div>

      {/* Manifest Block */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{currentT.todaysManifest}</h2>
          <button 
            onClick={fetchManifest}
            disabled={loading}
            style={{
              background: 'rgba(62, 205, 198, 0.1)',
              border: '1px solid rgba(62, 205, 198, 0.25)',
              color: '#3ecdc6',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(62, 205, 198, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(62, 205, 198, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(62, 205, 198, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(62, 205, 198, 0.25)';
              }
            }}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={loading ? "spin-sync" : ""}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {currentT.syncData}
            <style>{`
              @keyframes spinSync {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .spin-sync {
                animation: spinSync 1s linear infinite;
              }
            `}</style>
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            color: '#fca5a5',
            fontSize: '14px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 0',
            color: '#64748b'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'var(--primary)', marginBottom: '8px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-slow">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M4.93 4.93l2.83 2.83" />
                <path d="M16.24 16.24l2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="M4.93 19.07l2.83-2.83" />
                <path d="M16.24 7.76l2.83-2.83" />
              </svg>
              <style>{`
                @keyframes spinSlow {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .spin-slow {
                  animation: spinSlow 3s linear infinite;
                }
              `}</style>
            </div>
            <div>{currentT.retrieving}</div>
          </div>
        ) : manifest.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px border-dashed rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', color: '#64748b', marginBottom: '12px' }}>
              <svg width="36" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v18M12 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 12a7 7 0 0 0 14 0" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8', fontWeight: '500' }}>{currentT.noTours}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{currentT.reachOut}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {manifest.map(({ booking, guest, tour }) => {
              const capStatus = booking.captain_status || 'assigned';
              const isActionsExpanded = activeBookingId === booking._id;

              return (
                <div 
                  key={booking._id}
                  style={{
                    background: 'var(--panel-bg)',
                    border: `1px solid ${isActionsExpanded ? 'var(--primary, #3ecdc6)' : 'var(--border-color)'}`,
                    borderRadius: '18px',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    backdropFilter: 'blur(16px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* Tour Info Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <span style={{
                        background: 'rgba(62, 205, 198, 0.08)',
                        color: 'var(--primary, #3ecdc6)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {booking.slot?.toUpperCase() || 'TRIP'}
                      </span>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        margin: '6px 0 2px 0',
                        color: 'var(--text-primary)'
                      }}>{tour?.name || 'Assigned Eco-Tour'}</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        📍 {tour?.location || 'Bocas del Toro'}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}>
                      <span style={{
                        background: `${getStatusBadgeColor(capStatus)}18`,
                        color: getStatusBadgeColor(capStatus),
                        border: `1px solid ${getStatusBadgeColor(capStatus)}30`,
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {getStatusBadgeText(capStatus)}
                      </span>
                    </div>
                  </div>

                  <hr style={{ border: 0, borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '14px 0' }} />

                  {/* Guest pickup details */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>{currentT.guestName}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{guest?.name || 'Unregistered Guest'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>{currentT.pickupDock}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent, #3ecdc6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        {guest?.hotel_name || 'Nayara Bocas'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>{currentT.totalPax}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {booking.pax || 2} {currentT.persons}
                      </span>
                    </div>
                  </div>

                  {/* Status update area */}
                  {isActionsExpanded ? (
                    <div style={{
                      background: 'var(--bg-card-nested)',
                      borderRadius: '14px',
                      padding: '16px',
                      marginTop: '16px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#94a3b8',
                        marginBottom: '8px'
                      }}>
                        {currentT.notesLabel}
                      </label>
                       <input 
                        type="text"
                        placeholder={currentT.notesPlaceholder}
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          fontSize: '16px',
                          color: '#f8fafc',
                          marginBottom: '14px',
                          boxSizing: 'border-box'
                        }}
                      />

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '8px'
                      }}>
                        <button 
                          disabled={submittingStatus}
                          onClick={() => handleUpdateStatus(booking._id, 'confirmed')}
                          style={{
                            background: 'rgba(34, 197, 94, 0.08)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '10px',
                            padding: '12px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            minHeight: '48px'
                          }}
                        >
                          {currentT.confirmTrip}
                        </button>
                        <button 
                          disabled={submittingStatus}
                          onClick={() => handleUpdateStatus(booking._id, 'en-route')}
                          style={{
                            background: 'rgba(14, 165, 233, 0.08)',
                            color: '#0ea5e9',
                            border: '1px solid rgba(14, 165, 233, 0.2)',
                            borderRadius: '10px',
                            padding: '12px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            minHeight: '48px'
                          }}
                        >
                          {currentT.enRouteBtn}
                        </button>
                        <button 
                          disabled={submittingStatus}
                          onClick={() => handleUpdateStatus(booking._id, 'delayed')}
                          style={{
                            background: 'rgba(245, 158, 11, 0.08)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: '10px',
                            padding: '12px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            minHeight: '48px'
                          }}
                        >
                          {currentT.reportDelay}
                        </button>
                        <button 
                          disabled={submittingStatus}
                          onClick={() => handleUpdateStatus(booking._id, 'unsafe-conditions')}
                          style={{
                            background: 'rgba(239, 108, 108, 0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 108, 108, 0.2)',
                            borderRadius: '10px',
                            padding: '12px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            minHeight: '48px'
                          }}
                        >
                          {currentT.flagUnsafe}
                        </button>
                        <button 
                          disabled={submittingStatus}
                          onClick={() => handleUpdateStatus(booking._id, 'completed')}
                          style={{
                            background: 'rgba(168, 85, 247, 0.08)',
                            color: '#a855f7',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            borderRadius: '10px',
                            padding: '12px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            gridColumn: '1 / -1',
                            minHeight: '48px'
                          }}
                        >
                          {currentT.completeTour}
                        </button>
                      </div>

                      <button 
                        onClick={() => setActiveBookingId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '12px',
                          fontWeight: '500',
                          width: '100%',
                          textAlign: 'center',
                          marginTop: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {currentT.cancelUpdate}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setActiveBookingId(booking._id);
                        setStatusMessage(null);
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(62, 205, 198, 0.08)',
                        border: '1px solid rgba(62, 205, 198, 0.25)',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'var(--primary, #3ecdc6)',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '48px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(62, 205, 198, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(62, 205, 198, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(62, 205, 198, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(62, 205, 198, 0.25)';
                      }}
                    >
                      {currentT.updateRadioStatus}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {statusMessage && (
          <div style={{
            background: statusMessage.type === 'success' ? 'rgba(21, 128, 61, 0.08)' : 'rgba(185, 28, 28, 0.08)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(21, 128, 61, 0.2)' : 'rgba(185, 28, 28, 0.2)'}`,
            borderRadius: '12px',
            padding: '14px',
            color: statusMessage.type === 'success' ? '#15803d' : '#b91c1c',
            fontSize: '14px',
            fontWeight: '600',
            marginTop: '16px',
            textAlign: 'center'
          }}>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Real-time Condition Report Form */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)'
      }}>
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>{currentT.liveSafetyReport}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {currentT.liveSafetyDesc}
          </p>
        </div>

        <form onSubmit={handleReportConditions}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '18px'
          }}>
            {/* Sea State */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '8px' }}>
                {currentT.seaSwellState}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '4px',
                boxSizing: 'border-box'
              }}>
                {[
                  { value: 'calm', label: lang === 'es' ? 'Calmo' : 'Calm', desc: '0.0-0.5m' },
                  { value: 'moderate', label: lang === 'es' ? 'Mod.' : 'Mod.', desc: '0.5-1.2m' },
                  { value: 'rough', label: lang === 'es' ? 'Agitado' : 'Rough', desc: '1.2m+' }
                ].map(opt => {
                  const isSelected = conditions.sea_state === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setConditions(prev => ({ ...prev, sea_state: opt.value }))}
                      style={{
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? 'var(--primary-btn-text, #000000)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 2px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--primary-glow)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                      <span style={{ fontSize: '9px', fontWeight: '500', opacity: isSelected ? 0.9 : 0.6 }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '8px' }}>
                {currentT.visibility}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '4px',
                boxSizing: 'border-box'
              }}>
                {[
                  { value: 'clear', label: lang === 'es' ? 'Despejado' : 'Clear', desc: lang === 'es' ? 'Excelente' : 'Excellent' },
                  { value: 'moderate', label: lang === 'es' ? 'Bruma' : 'Haze', desc: lang === 'es' ? 'Moderada' : 'Moderate' },
                  { value: 'poor', label: lang === 'es' ? 'Chubasco' : 'Squall', desc: lang === 'es' ? 'Mala' : 'Poor' }
                ].map(opt => {
                  const isSelected = conditions.visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setConditions(prev => ({ ...prev, visibility: opt.value }))}
                      style={{
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? 'var(--primary-btn-text, #000000)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 2px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--primary-glow)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                      <span style={{ fontSize: '8px', fontWeight: '500', opacity: isSelected ? 0.9 : 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', textAlign: 'center' }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Precipitation */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '8px' }}>
                {currentT.precipitation}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '4px',
                boxSizing: 'border-box'
              }}>
                {[
                  { value: 'none', label: lang === 'es' ? 'Soleado' : 'Sunny', desc: lang === 'es' ? 'Despejado' : 'Clear' },
                  { value: 'light', label: lang === 'es' ? 'Lluvia' : 'Light', desc: lang === 'es' ? 'Llovizna' : 'Rain' },
                  { value: 'heavy', label: lang === 'es' ? 'Chubasco' : 'Heavy', desc: lang === 'es' ? 'Fuerte' : 'Squall' }
                ].map(opt => {
                  const isSelected = conditions.rain === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setConditions(prev => ({ ...prev, rain: opt.value }))}
                      style={{
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? 'var(--primary-btn-text, #000000)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 2px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--primary-glow)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                      <span style={{ fontSize: '8px', fontWeight: '500', opacity: isSelected ? 0.9 : 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', textAlign: 'center' }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' }}>{currentT.waterNotes}</label>
            <textarea 
              rows="2"
              placeholder={currentT.waterNotesPlaceholder}
              value={conditions.notes}
              onChange={(e) => setConditions(prev => ({ ...prev, notes: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.02))',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.background = 'var(--panel-bg)';
                e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.background = 'var(--bg-card-nested, rgba(0, 0, 0, 0.02))';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={submittingConditions}
            style={{
              width: '100%',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              color: 'var(--primary-btn-text, #000000)',
              fontSize: '15px',
              fontWeight: '700',
              cursor: submittingConditions ? 'not-allowed' : 'pointer',
              minHeight: '48px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!submittingConditions) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.filter = 'brightness(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submittingConditions) {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.filter = 'none';
              }
            }}
          >
            {submittingConditions ? currentT.broadcasting : currentT.logSeaReport}
          </button>
        </form>

        {conditionsMessage && (
          <div style={{
            background: conditionsMessage.type === 'success' ? 'rgba(21, 128, 61, 0.08)' : 'rgba(185, 28, 28, 0.08)',
            border: `1px solid ${conditionsMessage.type === 'success' ? 'rgba(21, 128, 61, 0.2)' : 'rgba(185, 28, 28, 0.2)'}`,
            borderRadius: '12px',
            padding: '14px',
            color: conditionsMessage.type === 'success' ? '#15803d' : '#b91c1c',
            fontSize: '14px',
            fontWeight: '600',
            marginTop: '16px',
            textAlign: 'center'
          }}>
            {conditionsMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
