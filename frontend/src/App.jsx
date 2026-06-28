import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import ScheduleView from './components/ScheduleView';
import ChatWidget from './components/ChatWidget';
import ControlPanel from './components/ControlPanel';
import ItineraryDoc from './components/ItineraryDoc';
import ErrorBoundary from './components/ErrorBoundary';
import WeatherHorizon from './components/WeatherHorizon';
import CaptainPortal from './components/CaptainPortal';
import OperatorLoginForm from './components/OperatorLoginForm';
import Magnet from './components/Magnet';



const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://islandflow-aws-162640897083.us-central1.run.app');

// Synchronously parse query parameters to prevent mount-time state transitions and race conditions
const getInitialParams = () => {
  if (typeof window === 'undefined') {
    return { view: 'landing', guestId: 'g1', token: null, secureActive: false, guestViewOnly: false, itineraryOnly: false, captainId: 'cap1' };
  }
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  const urlGuestId = params.get('guest_id');
  const urlView = params.get('view');
  const urlCaptainId = params.get('captain_id');
  const urlItineraryOnly = params.get('itinerary_only') === 'true';
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  
  if (urlCaptainId) {
    return { view: 'captain', guestId: 'g1', token: null, secureActive: false, guestViewOnly: false, itineraryOnly: urlItineraryOnly, captainId: urlCaptainId };
  } else if (urlToken) {
    return { view: 'guest', guestId: 'g1', token: urlToken, secureActive: true, guestViewOnly: true, itineraryOnly: urlItineraryOnly, captainId: 'cap1' };
  } else if (urlGuestId) {
    const isSecureParam = params.get('secure') === 'true';
    return { view: 'guest', guestId: urlGuestId, token: null, secureActive: isSecureParam, guestViewOnly: true, itineraryOnly: urlItineraryOnly, captainId: 'cap1' };
  } else if (urlView && ['landing', 'guest', 'operator', 'integrations', 'captain'].includes(urlView)) {
    return { view: urlView, guestId: 'g1', token: null, secureActive: false, guestViewOnly: false, itineraryOnly: urlItineraryOnly, captainId: 'cap1' };
  } else if (isStandalone) {
    return { view: 'captain', guestId: 'g1', token: null, secureActive: false, guestViewOnly: false, itineraryOnly: urlItineraryOnly, captainId: 'cap1' };
  }
  return { view: 'landing', guestId: 'g1', token: null, secureActive: false, guestViewOnly: false, itineraryOnly: urlItineraryOnly, captainId: 'cap1' };
};

const initialParams = getInitialParams();

// Map of standard tenant brand configurations for instantaneous operator design system previews
const tenantBrandsMock = {
  hotel_nayara: {
    name: "Nayara Bocas del Toro",
    primary_color: "hsl(188, 86%, 38%)",
    primary_glow: "rgba(15, 186, 211, 0.12)",
    font: "Inter, system-ui, sans-serif",
    welcome_message: "Your luxury overwater villa experience begins now. Respect.",
    theme: "theme-ocean"
  },
  hotel_lacoralina: {
    name: "La Coralina Island House",
    primary_color: "hsl(45, 60%, 55%)",
    primary_glow: "rgba(212, 175, 55, 0.12)",
    font: "var(--font-serif), Georgia, serif",
    welcome_message: "Welcome to your Balinese wellness sanctuary in the Caribbean.",
    theme: "theme-wellness"
  },
  hotel_sweetbocas: {
    name: "Sweet Bocas",
    primary_color: "hsl(330, 75%, 45%)",
    primary_glow: "rgba(219, 39, 119, 0.12)",
    font: "Outfit, Poppins, system-ui, sans-serif",
    welcome_message: "Step into absolute, sustainable luxury on our private island estate.",
    theme: "theme-hibiscus"
  },
  hotel_bocasvillas: {
    name: "Bocas Luxury Villas",
    primary_color: "hsl(150, 65%, 35%)",
    primary_glow: "rgba(34, 197, 94, 0.12)",
    font: "Roboto, system-ui, sans-serif",
    welcome_message: "Your boutique cliffside eco-villa retreat is ready, my friend.",
    theme: "theme-forest"
  },
  hotel_redfrog: {
    name: "Red Frog Beach Resort",
    primary_color: "hsl(15, 85%, 50%)",
    primary_glow: "rgba(249, 115, 22, 0.12)",
    font: "Poppins, Inter, system-ui, sans-serif",
    welcome_message: "Welcome to our vibrant beachfront jungle playground.",
    theme: "theme-volcano"
  }
};

const DEFAULT_GUEST_BRANDS = {
  g1: 'hotel_nayara',
  g2: 'hotel_lacoralina',
  g3: 'hotel_sweetbocas',
  g4: 'hotel_bocasvillas',
  g5: 'hotel_redfrog',
  g6: 'hotel_nayara',
  g7: 'hotel_sweetbocas',
  g8: 'hotel_lacoralina',
  g9: 'hotel_bocasvillas',
  g10: 'hotel_redfrog'
};

// Safe localStorage wrapper functions to prevent crash in restricted environments (incognito, sandboxed iframes, etc.)
const safeLocalStorageGet = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (e) {
    console.warn(`localStorage read failed for key "${key}":`, e);
    return fallback;
  }
};

const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage write failed for key "${key}":`, e);
  }
};

const safeLocalStorageRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage remove failed for key "${key}":`, e);
  }
};

// High-fidelity fallback mock data to prevent blank guest portals when the server is offline or unseeded
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
    const parts = todayStr.split(/[-/]/).map(Number);
    const [yyyy, mm, dd] = parts;
    if (isNaN(yyyy) || isNaN(mm) || isNaN(dd)) {
      throw new Error("Invalid date format from Intl.DateTimeFormat");
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

const MOCK_GUESTS = [
  {
    _id: "g1",
    name: "Dorien Van Den Abbeele",
    hotel_id: "hotel_nayara",
    hotel_name: "Nayara Bocas del Toro",
    room: "Overwater Suite 104",
    phone: "+32 499 123456"
  },
  {
    _id: "g2",
    name: "Alex Mercer",
    hotel_id: "hotel_lacoralina",
    hotel_name: "La Coralina Island House",
    room: "Bungalow 7",
    phone: "+1 555 123 4567"
  }
];

const MOCK_TOURS = [
  {
    _id: "tour_zapatilla",
    title: "Zapatilla Island Snorkeling Eco-Tour",
    description: "Explore the legendary white-sand keys of Cayos Zapatilla. Swim through pristine coral reefs, view tropical marine life, and walk through private jungle trails.",
    duration: "4 hours",
    price: "$85",
    category: "marine",
    difficulty: "medium",
    spots_left: 6,
    icon: "snorkel"
  },
  {
    _id: "tour_rumba",
    title: "Que Siga La Rumba! Sunset Catamaran Cruise",
    description: "Sail through the Bocas archipelago on our luxury catamaran. Enjoy tropical mocktails, authentic Afro-Antillean bites, and dance under the golden sunset.",
    duration: "3 hours",
    price: "$95",
    category: "adventure",
    difficulty: "low",
    spots_left: 12,
    icon: "catamaran"
  },
  {
    _id: "tour_chocolate",
    title: "Organic Cacao & Chocolate Workshop",
    description: "Learn the secrets of organic chocolate making from indigenous growers. Harvest, roast, grind cacao beans, and create your custom dark chocolate bar.",
    duration: "2.5 hours",
    price: "$45",
    category: "culture",
    difficulty: "low",
    spots_left: 8,
    icon: "chocolate"
  },
  {
    _id: "tour_canopy",
    title: "Bastimentos Island Rainforest Canopy Zip-Line",
    description: "Fly over the ancient rainforest canopy of Bastimentos. Spot red frogs, sloths, and toucans as you cross 7 thrilling high-altitude zip lines.",
    duration: "3 hours",
    price: "$75",
    category: "adventure",
    difficulty: "high",
    spots_left: 4,
    icon: "zipline"
  }
];

const getMockLogistics = (dates) => [
  {
    date: dates[0],
    weather: "Sunny",
    alert: "none",
    wave_height: 0.5,
    wave_status: "safe",
    temperature: "31°C",
    wind_speed: "12 km/h"
  },
  {
    date: dates[1],
    weather: "Rainy",
    alert: "rain_heavy",
    wave_height: 0.9,
    wave_status: "safe",
    temperature: "28°C",
    wind_speed: "18 km/h"
  },
  {
    date: dates[2],
    weather: "Stormy",
    alert: "storm",
    wave_height: 1.8,
    wave_status: "danger",
    temperature: "26°C",
    wind_speed: "35 km/h"
  },
  {
    date: dates[3],
    weather: "Sunny",
    alert: "none",
    wave_height: 0.4,
    wave_status: "safe",
    temperature: "30°C",
    wind_speed: "10 km/h"
  }
];

const getMockBookings = (dates) => [
  {
    _id: "b_1",
    guest_id: "g1",
    tour_id: "tour_rumba",
    date: dates[0],
    slot: "afternoon",
    status: "confirmed"
  },
  {
    _id: "b_2",
    guest_id: "g1",
    tour_id: "tour_zapatilla",
    date: dates[1],
    slot: "morning",
    status: "confirmed"
  },
  {
    _id: "b_3",
    guest_id: "g1",
    tour_id: "tour_canopy",
    date: dates[2],
    slot: "morning",
    status: "confirmed"
  },
  {
    _id: "b_4",
    guest_id: "g1",
    tour_id: "tour_chocolate",
    date: dates[2],
    slot: "afternoon",
    status: "confirmed"
  }
];

const getMockItineraryMarkdown = (dates) => `# PERSONALIZED DIGITAL ECO-CONCIERGE ITINERARY
Guest: **Dorien Van Den Abbeele** | Resort: **Nayara Bocas del Toro**
Room: **Overwater Suite 104** | Stay: **4 Days / 3 Nights**

---

### 🌴 Welcome to Nayara Bocas del Toro!
Your luxury overwater villa experience begins now. Under our active, weather-aware guidance, we have designed the ultimate tropical itinerary. Let's make every moment count!

---

### 📅 Daily Schedule

#### 🌅 DAY 1 — \${dates[0]}
- **Afternoon (14:00 - 17:00)**: ⛵ *Que Siga La Rumba! Sunset Catamaran Cruise*
  *Set sail on our luxury catamaran. Enjoy tropical mocktails, Afro-Antillean bites, and beautiful music under the Caribbean sun.*
- **Evening (19:00)**: 🍽️ Dinner at Nayara Elephant House Restaurant.

#### 🌧️ DAY 2 — \${dates[1]} (Rain Forecasted)
- **Morning (09:00 - 13:00)**: 🤿 *Zapatilla Island Snorkeling Eco-Tour*
  *Pristine coral reefs and white sand. (Note: Light rain forecasted, but conditions remain safe for snorkeling!)*
- **Afternoon**: 🍹 Free relaxation at the Overwater Pool Bar.

#### ⛈️ DAY 3 — \${dates[2]} (Storm Warning)
- **Morning (09:00 - 12:00)**: 🧗 *Bastimentos Canopy Zip-Line* (⚠️ *Storm warning active — indoor rescheduling recommendation ready!*)
- **Afternoon (14:00 - 16:30)**: 🍫 *Organic Cacao & Chocolate Workshop*
  *Escape the storm indoors with a cozy culinary chocolate craft workshop.*

#### ☀️ DAY 4 — \${dates[3]} (Sunny)
- **Morning**: 🧘 Sunrise Yoga & Paddleboarding on the flat lagoon.
- **Midday**: 🛥️ Checkout and departure transfer back to Bocas Town.

---
*Powered by Rain or Shine AI stay engine.*`;

function App() {
  const [bookings, setBookings] = useState(() => {
    const dates = getBocasFallbackDates();
    return getMockBookings(dates);
  });
  const [tours, setTours] = useState(MOCK_TOURS);
  const [logistics, setLogistics] = useState(() => {
    const dates = getBocasFallbackDates();
    return getMockLogistics(dates);
  });
  const [guests, setGuests] = useState(MOCK_GUESTS);
  const [itineraryMarkdown, setItineraryMarkdown] = useState(() => {
    const dates = getBocasFallbackDates();
    return getMockItineraryMarkdown(dates);
  });
  const [messages, setMessages] = useState([]);
  const [agentLogs, setAgentLogs] = useState(['Simulation environment initialized. Ready for weather events.']);
  const [loading, setLoading] = useState(false);
  const [isRealDynamo, setIsRealDynamo] = useState(false);
  const [guestId, setGuestId] = useState(initialParams.guestId);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [isGuestViewOnly, setIsGuestViewOnly] = useState(initialParams.guestViewOnly);
  const [welcomeCardGuestId, setWelcomeCardGuestId] = useState(initialParams.guestId);
  const [token, setToken] = useState(initialParams.token);
  const [tenantBrand, setTenantBrand] = useState(null);
  const [tenantsList, setTenantsList] = useState([]);
  const [extractionUrl, setExtractionUrl] = useState('');
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [isSecureModeActive, setIsSecureModeActive] = useState(initialParams.secureActive);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [operatorFlyerToken, setOperatorFlyerToken] = useState('');
  const [operatorHotelId, setOperatorHotelId] = useState(() => safeLocalStorageGet('operatorHotelId', 'hotel_nayara'));
  const [operatorHotelName, setOperatorHotelName] = useState(() => safeLocalStorageGet('operatorHotelName', 'Nayara Bocas del Toro'));
  const lastGuestIdRef = React.useRef(null);
  const isInitialLoadRef = React.useRef(true);
  const hasLoadedBackendItineraryRef = React.useRef(false);
  const lastRequestRef = React.useRef(0);

  const [view, setView] = useState(initialParams.view);
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' or 'itinerary'
  const [lang, setLang] = useState(() => safeLocalStorageGet('islandflow_lang_v2', 'es'));

  useEffect(() => {
    safeLocalStorageSet('islandflow_lang_v2', lang);
  }, [lang]);
  const [captainId, setCaptainId] = useState(initialParams.captainId || 'cap1');
  const [onboardingCaptainId, setOnboardingCaptainId] = useState('cap1');
  const [captains, setCaptains] = useState([]);
  const [isItineraryOnly, setIsItineraryOnly] = useState(initialParams.itineraryOnly);
  const [archActiveLayer, setArchActiveLayer] = useState('all');
  const [selectedToolId, setSelectedToolId] = useState('get_tours');


  // Synchronize view state with browser URL search parameters for Pendo pageview tracking and bookmarkability
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const currentView = url.searchParams.get('view');
    
    // Only push state if the URL doesn't already match the current view state
    if (currentView !== view) {
      if (view === 'landing') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', view);
      }
      
      // Preserve other parameters like guest_id and token
      window.history.pushState(null, '', url.pathname + url.search);
      

    }
  }, [view]);

  // States & Refs for resilient custom dropdown menus
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const guestDropdownRef = React.useRef(null);
  const [flyerDropdownOpen, setFlyerDropdownOpen] = useState(false);
  const flyerDropdownRef = React.useRef(null);
  const [portalsDropdownOpen, setPortalsDropdownOpen] = useState(false);
  const portalsDropdownRef = React.useRef(null);

  // Transition Helper for silky same-document view morphs using React 19 flushSync
  const transitionState = (updateFn) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(updateFn);
      });
    } else {
      updateFn();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
        setGuestDropdownOpen(false);
      }
      if (flyerDropdownRef.current && !flyerDropdownRef.current.contains(event.target)) {
        setFlyerDropdownOpen(false);
      }
      if (portalsDropdownRef.current && !portalsDropdownRef.current.contains(event.target)) {
        setPortalsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Unified navigation router to clear secure view-only session locks when exiting Guest Portal context
  const navigateToView = (newView) => {
    transitionState(() => {
      if (newView !== 'guest') {
        setToken(null);
        setIsSecureModeActive(false);
        setIsGuestViewOnly(false);
      }
      setView(newView);
    });
  };

  // Manual Check-in Form States
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualHotel, setManualHotel] = useState('hotel_nayara');
  const [manualStayStart, setManualStayStart] = useState(new Date().toISOString().split('T')[0]);
  const [manualStayEnd, setManualStayEnd] = useState(new Date(Date.now() + 259200000).toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');
  const [manualPreferences, setManualPreferences] = useState([]);
  const [manualBookings, setManualBookings] = useState([]);
  const [integrationTab, setIntegrationTab] = useState('manual'); // 'manual', 'webhook', 'custom_tours', or 'messaging'
  const [messagingGuestId, setMessagingGuestId] = useState('');
  const [transferIncluded, setTransferIncluded] = useState(true);
  const [weatherNoteIncluded, setWeatherNoteIncluded] = useState(true);
  const [showPushToast, setShowPushToast] = useState(false);
  const [pushToastText, setPushToastText] = useState('');
  const [previewChannel, setPreviewChannel] = useState('whatsapp'); // 'whatsapp' or 'email'
  const [messagingSubTab, setMessagingSubTab] = useState('guest'); // 'guest' or 'providers'
  const [notifiedProviders, setNotifiedProviders] = useState({}); // mapping dispatchId -> 'pending' | 'whatsapp' | 'webhook'
  const [successGuest, setSuccessGuest] = useState(null);
  const [logoErrors, setLogoErrors] = useState({});

  const handleManualCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      alert("Please enter the guest's name and phone number.");
      return;
    }
    
    // Generate a unique, recognizable ID for manual check-ins
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.floor(100 + Math.random() * 900);
    const guestIdGenerated = `g_manual_${timestamp}_${randomPart}`;
    
    // Get hotel name based on hotel_id
    const hotelNamesMap = {
      'hotel_nayara': 'Nayara Bocas del Toro',
      'hotel_lacoralina': 'La Coralina Island House',
      'hotel_sweetbocas': 'Sweet Bocas',
      'hotel_bocasvillas': 'Bocas Luxury Villas',
      'hotel_redfrog': 'Red Frog Beach Resort'
    };
    const foundTenant = tenantsList.find(t => t._id === manualHotel);
    const hotelNameSelected = foundTenant ? foundTenant.name : (hotelNamesMap[manualHotel] || 'La Coralina Island House');

    // Prepare payload
    const payload = {
      guest_id: guestIdGenerated,
      name: manualName,
      phone: manualPhone,
      preferences: manualPreferences,
      stay_start: manualStayStart,
      stay_end: manualStayEnd,
      notes: manualNotes,
      hotel_id: manualHotel,
      hotel_name: hotelNameSelected,
      bookings: manualBookings
    };

    // Sync via existing PMS sync function with skipRedirect = true
    await handlePMSSync(payload, true);

    // Call the secure token generation API
    let secureToken = null;
    try {
      addLog(`🔒 Requesting production HMAC secure token for guest '${guestIdGenerated}'...`);
      const tokenRes = await fetch(`${API_BASE}/api/generate-secure-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestIdGenerated })
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.success) {
          secureToken = tokenData.token;
          addLog(`🔑 Production secure token generated successfully.`);
        }
      }
    } catch (err) {
      console.error("Error generating secure token:", err);
      addLog(`[ALERT] Token endpoint error: ${err.message}. Falling back to standard URL mapping.`);
    }

    // Save success guest details to display the premium onboarding card
    setSuccessGuest({
      ...payload,
      secure_token: secureToken
    });

    // Reset manual form fields
    setManualName('');
    setManualPhone('');
    setManualNotes('');
    setManualPreferences([]);
    setManualBookings([]);
  };

  const handleExtractBrand = async () => {
    if (!extractionUrl.trim()) return;
    setLoadingBrand(true);
    addLog(`[ACTION] Calling AI Brand Extractor endpoint with URL: ${extractionUrl}`);
    try {
      const res = await fetch(`${API_BASE}/api/tenant/extract-brand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractionUrl })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Brand extraction endpoint error.");
      }
      const data = await res.json();
      if (data.success && data.tenant_brand) {
        addLog(`[SUCCESS] Successfully brand-onboarded ${data.tenant_brand.name}! Generated theme: ${data.tenant_brand.theme}`);
        
        // Add or update in tenantsList
        setTenantsList(prev => {
          const filtered = prev.filter(t => t._id !== data.tenant_brand._id);
          return [...filtered, data.tenant_brand];
        });
        
        // Automatically select the newly created hotel!
        setManualHotel(data.tenant_brand._id);
        setExtractionUrl('');
      } else {
        throw new Error(data.message || "Failed to extract brand identity.");
      }
    } catch (err) {
      console.error("Error in brand extraction:", err);
      addLog(`[ERROR] Brand Extraction Failed: ${err.message}`);
      alert(`Brand onboarding failed: ${err.message}`);
    } finally {
      setLoadingBrand(false);
    }
  };

  const handleDeleteHotel = async (hotelId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this custom hotel? This will delete its brand design system from the database.")) {
      return;
    }
    
    addLog(`[ACTION] Removing custom hotel brand: ${hotelId}`);
    try {
      const res = await fetch(`${API_BASE}/api/tenant/${hotelId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setTenantsList(prev => prev.filter(t => t._id !== hotelId));
        addLog(`[SUCCESS] Custom hotel brand '${hotelId}' removed successfully from DB.`);
        if (manualHotel === hotelId) {
          setManualHotel("hotel_lacoralina");
        }
      } else {
        throw new Error(data.detail || "Failed to delete hotel.");
      }
    } catch (err) {
      console.error("Error in hotel deletion:", err);
      addLog(`[ERROR] Hotel Deletion Failed: ${err.message}`);
      alert(`Hotel removal failed: ${err.message}`);
    }
  };

  const handleDeleteGuest = async (targetGuestId, e) => {
    if (e) e.stopPropagation();
    
    // Prevent deleting default guests
    if (['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'].includes(targetGuestId)) {
      alert("Cannot delete default system mock guests.");
      return;
    }
    
    const targetGuest = (guests || []).find(g => g && g._id === targetGuestId);
    const guestName = targetGuest ? targetGuest.name : targetGuestId;
    
    if (!window.confirm(`Are you sure you want to delete guest "${guestName}"? This will remove their itinerary and all bookings.`)) {
      return;
    }
    
    addLog(`[ACTION] Deleting manual guest: ${targetGuestId}`);
    try {
      const res = await fetch(`${API_BASE}/api/guest/${targetGuestId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setGuests(prev => prev.filter(g => g && g._id !== targetGuestId));
        addLog(`[SUCCESS] Guest '${guestName}' removed successfully from DB.`);
        
        // If we deleted the currently active guest, reset back to g1
        if (guestId === targetGuestId) {
          setToken(null);
          setIsSecureModeActive(false);
          setIsGuestViewOnly(false);
          setTenantBrand(null);
          setGuestId("g1");
          setWelcomeCardGuestId("g1");
          setMessages([]);
          setBookings([]);
          setItineraryMarkdown('');
          await fetchStatus("g1");
        } else {
          // Just refresh state
          await fetchStatus(guestId);
        }
        
        // If we deleted the messaging selected guest, reset that state too
        if (messagingGuestId === targetGuestId) {
          setMessagingGuestId('g1');
        }
      } else {
        throw new Error(data.detail || "Failed to delete guest.");
      }
    } catch (err) {
      console.error("Error in guest deletion:", err);
      addLog(`[ERROR] Guest Deletion Failed: ${err.message}`);
      alert(`Guest deletion failed: ${err.message}`);
    }
  };

  // Custom Tour Register Form States
  const [customTourName, setCustomTourName] = useState('');
  const [customTourType, setCustomTourType] = useState('outdoor');
  const [customTourDesc, setCustomTourDesc] = useState('');
  const [customTourPrice, setCustomTourPrice] = useState('50.0');
  const [customTourSlots, setCustomTourSlots] = useState(['morning', 'afternoon']);
  const [customTourCapacity, setCustomTourCapacity] = useState('10');
  const [customTourLocation, setCustomTourLocation] = useState('Bocas del Toro');

  const handleCustomTourSubmit = async (e) => {
    e.preventDefault();
    if (!customTourName.trim()) {
      alert("Please enter a name for the custom excursion.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/operator/add-tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customTourName,
          type: customTourType,
          description: customTourDesc,
          price: parseFloat(customTourPrice) || 0.0,
          slots: customTourSlots,
          capacity: parseInt(customTourCapacity) || 10,
          location: customTourLocation
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Custom excursion successfully added to DynamoDB!");
        setCustomTourName('');
        setCustomTourDesc('');
        setCustomTourPrice('50.0');
        setCustomTourSlots(['morning', 'afternoon']);
        setCustomTourCapacity('10');
        setCustomTourLocation('Bocas del Toro');
        
        // Refresh status list
        fetchStatus(guestId);
      } else {
        alert(`Failed to add custom excursion: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error adding custom tour:", err);
      alert(`Network error adding excursion: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 1. Load initial status from token if active, isolated to token changes only to prevent switching loops
  useEffect(() => {
    if (token) {
      fetchStatus(null, token);
    }
  }, [token]);

  // 2. Load initial status from guestId if token is null (e.g. open sandbox switcher)
  useEffect(() => {
    if (!token && guestId !== lastGuestIdRef.current) {
      fetchStatus(guestId);
    }
  }, [guestId, token]);

  // Refetch status when view becomes 'operator' or operatorHotelId changes (securing multi-tenant separation)
  useEffect(() => {
    if (view === 'operator') {
      fetchStatus(guestId);
    }
  }, [view, operatorHotelId]);

  // Handle automatic theme adjustment depending on forecast alerts
  useEffect(() => {
    if (logistics && logistics.length > 0) {
      const hasRainAlert = logistics.some(l => l.alert === 'rain_warning');
      if (hasRainAlert) {
        document.body.classList.remove('theme-sunny');
        document.body.classList.add('theme-rainy');
      } else {
        document.body.classList.remove('theme-rainy');
        document.body.classList.add('theme-sunny');
      }
    } else {
      // Fallback/Default
      document.body.classList.remove('theme-rainy');
      document.body.classList.add('theme-sunny');
    }
  }, [logistics]);

  // Handle locking body scroll for dashboard layouts to keep viewport perfectly stable
  useEffect(() => {
    if (view === 'guest' || view === 'operator') {
      document.body.classList.add('dashboard-layout');
      document.documentElement.classList.add('dashboard-layout');
    } else {
      document.body.classList.remove('dashboard-layout');
      document.documentElement.classList.remove('dashboard-layout');
    }
    return () => {
      document.body.classList.remove('dashboard-layout');
      document.documentElement.classList.remove('dashboard-layout');
    };
  }, [view]);

  const fetchStatus = async (currentGuestId = 'g1', currentToken = null) => {
    const requestId = ++lastRequestRef.current;
    try {
      const activeToken = currentToken || token;
      let url = `${API_BASE}/api/status`;
      if (activeToken) {
        url += `?token=${encodeURIComponent(activeToken)}`;
      } else {
        url += `?guest_id=${currentGuestId}`;
        if (isGuestViewOnly || isSecureModeActive) {
          url += `&secure=true`;
        }
      }
      
      if (view === 'operator' && operatorHotelId) {
        url += url.includes('?') ? `&hotel_id=${operatorHotelId}` : `?hotel_id=${operatorHotelId}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not connect to FastAPI backend server.");
      const data = await res.json();
      
      if (!data || !data.guests || data.guests.length === 0) {
        throw new Error("FastAPI backend returned unseeded/empty database state.");
      }
      
      // Ignore stale responses to eliminate network race conditions and infinite loops
      if (requestId !== lastRequestRef.current) {
        return;
      }
      
      transitionState(() => {
        setBookings(data.bookings || []);
        setTours(data.tours || []);
        setLogistics(data.logistics || []);
        setGuests(data.guests || []);
        setCaptains(data.captains || []);
        const brand = data.tenant_brand || null;
        setTenantBrand(brand);
        setTenantsList(data.tenants || []);

        // Dynamically sync manualHotel selection to the current guest's active brand
        if (brand && brand._id) {
          setManualHotel(brand._id);
        } else if (data.guest_id && DEFAULT_GUEST_BRANDS[data.guest_id]) {
          setManualHotel(DEFAULT_GUEST_BRANDS[data.guest_id]);
        }
        
        if (data.guest_id) {
          if (data.guest_id !== guestId) {
            setMessages(data.chat_history || []);
          } else if (data.chat_history) {
            setMessages(prev => {
              if (data.chat_history.length > prev.length) {
                return data.chat_history;
              }
              return prev;
            });
          }
          setGuestId(data.guest_id);
        }
        
        const newMarkdown = data.itinerary_markdown || '';
        const isSameGuest = lastGuestIdRef.current === data.guest_id;
        
        setItineraryMarkdown(prev => {
          // Trigger the updated itinerary popup modal ONLY if the guest ID remains the same
          // and we have already successfully loaded the initial backend itinerary for this guest.
          if (isSameGuest && hasLoadedBackendItineraryRef.current) {
            if (prev && newMarkdown && prev !== newMarkdown) {
              setShowItineraryModal(true);
            }
          }
          return newMarkdown;
        });
        
        // Update our guest tracker ref with the newly loaded guest ID
        if (data.guest_id) {
          lastGuestIdRef.current = data.guest_id;
        }

        // Track whether backend itinerary has been loaded for the active guest
        if (isSameGuest) {
          if (data.itinerary_markdown) {
            hasLoadedBackendItineraryRef.current = true;
          }
        } else {
          hasLoadedBackendItineraryRef.current = !!data.itinerary_markdown;
        }

        // Keep as fallback/failsafe for legacy initial load flags
        isInitialLoadRef.current = false;
        
        setIsRealDynamo(data.is_real_dynamodb);
      });
    } catch (error) {
      console.warn("fetchStatus failing or unseeded, triggering fallback:", error);
      addLog(`[WARN] Backend unseeded or offline. Activating 5-star high-fidelity local sandbox fallback states.`);
      
      // Ignore stale responses to eliminate network race conditions and infinite loops
      if (requestId !== lastRequestRef.current) {
        return;
      }

      transitionState(() => {
        const fallbackDates = getBocasFallbackDates();
        const fallbackBookings = getMockBookings(fallbackDates);
        const fallbackLogistics = getMockLogistics(fallbackDates);
        
        setBookings(fallbackBookings);
        setTours(MOCK_TOURS);
        setLogistics(fallbackLogistics);
        setGuests(MOCK_GUESTS);
        
        const selectedId = currentGuestId || guestId || 'g1';
        if (selectedId !== guestId) {
          setGuestId(selectedId);
        }
        
        const selectedGuest = MOCK_GUESTS.find(g => g._id === selectedId) || MOCK_GUESTS[0];
        const selectedGuestName = selectedGuest.name;
        const selectedGuestHotel = selectedGuest.hotel_name;
        const selectedGuestRoom = selectedGuest.room;
        
        const mockItinerary = `# PERSONALIZED DIGITAL ECO-CONCIERGE ITINERARY
Guest: **${selectedGuestName}** | Resort: **${selectedGuestHotel}**
Room: **${selectedGuestRoom}** | Stay: **4 Days / 3 Nights**

---

### 🌴 Welcome to ${selectedGuestHotel}!
Your luxury tropical experience begins now. Under our active, weather-aware guidance, we have designed the ultimate tropical itinerary. Let's make every moment count!

---

### 📅 Daily Schedule

#### 🌅 DAY 1 — ${fallbackDates[0]}
- **Afternoon (14:00 - 17:00)**: ⛵ *Que Siga La Rumba! Sunset Catamaran Cruise*
  *Set sail on our luxury catamaran. Enjoy tropical mocktails, Afro-Antillean bites, and beautiful music under the Caribbean sun.*
- **Evening (19:00)**: 🍽️ Dinner at the main resort restaurant.

#### 🌧️ DAY 2 — ${fallbackDates[1]} (Rain Forecasted)
- **Morning (09:00 - 13:00)**: 🤿 *Zapatilla Island Snorkeling Eco-Tour*
  *Pristine coral reefs and white sand. (Note: Light rain forecasted, but conditions remain safe for snorkeling!)*
- **Afternoon**: 🍹 Free relaxation at the resort Pool Bar.

#### ⛈️ DAY 3 — ${fallbackDates[2]} (Storm Warning)
- **Morning (09:00 - 12:00)**: 🧗 *Rainforest Canopy Zip-Line* (⚠️ *Storm warning active — indoor rescheduling recommendation ready!*)
- **Afternoon (14:00 - 16:30)**: 🍫 *Organic Cacao & Chocolate Workshop*
  *Escape the storm indoors with a cozy culinary chocolate craft workshop.*

#### ☀️ DAY 4 — ${fallbackDates[3]} (Sunny)
- **Morning**: 🧘 Sunrise Yoga & Paddleboarding on the flat lagoon.
- **Midday**: 🛥️ Checkout and departure transfer.

---
*Powered by Rain or Shine AI stay engine.*`;
        
        setItineraryMarkdown(mockItinerary);
        setIsRealDynamo(false);
      });
    }
  };

  // Dynamic Live Theme Engine (overrides both documentElement and body for CSS specificity)
  useEffect(() => {
    const activeBrand = view === 'integrations'
      ? (tenantBrandsMock[manualHotel] || tenantsList.find(t => t._id === manualHotel) || tenantBrand || tenantBrandsMock[DEFAULT_GUEST_BRANDS[guestId]] || tenantBrandsMock['hotel_lacoralina'])
      : (tenantBrand || tenantBrandsMock[DEFAULT_GUEST_BRANDS[guestId]] || tenantBrandsMock['hotel_lacoralina']);

    const targets = [document.documentElement, document.body];

    if (activeBrand) {
      // Dynamically load Google Fonts if specified
      if (activeBrand.font) {
        const fontNames = activeBrand.font
          .split(',')
          .map(f => f.trim().replace(/['"]/g, ''))
          .filter(f => f && !f.startsWith('var(') && f !== 'system-ui' && f !== 'sans-serif' && f !== 'serif' && f !== 'monospace');
        
        if (fontNames.length > 0) {
          const fontQuery = fontNames.map(f => `family=${f.replace(/\s+/g, '+')}:wght@300;400;500;600;700`).join('&');
          const fontUrl = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
          
          let fontLink = document.getElementById('dynamic-brand-font');
          if (!fontLink) {
            fontLink = document.createElement('link');
            fontLink.id = 'dynamic-brand-font';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
          }
          fontLink.href = fontUrl;
        } else {
          const fontLink = document.getElementById('dynamic-brand-font');
          if (fontLink) fontLink.remove();
        }
      } else {
        const fontLink = document.getElementById('dynamic-brand-font');
        if (fontLink) fontLink.remove();
      }

      targets.forEach(target => {
        target.style.setProperty('--primary', activeBrand.primary_color);
        target.style.setProperty('--primary-glow', activeBrand.primary_glow);
        
        if (activeBrand.font) {
          target.style.setProperty('--font-sans', activeBrand.font);
        }
        
        if (activeBrand.primary_color && activeBrand.primary_color.includes('hsl')) {
          const colorValue = activeBrand.primary_color.replace('hsl(', '').replace(')', '');
          target.style.setProperty('--border-color', `hsla(${colorValue}, 0.24)`);
          target.style.setProperty('--border-glow', `hsla(${colorValue}, 0.4)`);
          target.style.setProperty('--msg-user-bg', `hsla(${colorValue}, 0.14)`);
          target.style.setProperty('--msg-agent-bg', `${activeBrand.primary_glow || `hsla(${colorValue}, 0.08)`}`);

          // Dynamically compute complementary/split-complementary accent color and high-contrast button text color
          const hslParts = colorValue.split(',').map(p => p.trim());
          if (hslParts.length === 3) {
            const h = parseInt(hslParts[0], 10);
            const s = hslParts[1];
            const lVal = parseInt(hslParts[2], 10);
            const lStr = hslParts[2];
            
            // Set dynamic primary button text color based on lightness to ensure perfect contrast
            const btnText = lVal < 52 ? '#ffffff' : '#0f172a';
            target.style.setProperty('--primary-btn-text', btnText);

            const accentHue = (h + 150) % 360;
            target.style.setProperty('--accent', `hsl(${accentHue}, ${s}, ${lStr})`);
            target.style.setProperty('--accent-glow', `hsla(${accentHue}, ${s}, ${lStr}, 0.12)`);
          } else {
            target.style.setProperty('--primary-btn-text', '#ffffff');
            target.style.setProperty('--accent', activeBrand.primary_color);
            target.style.setProperty('--accent-glow', activeBrand.primary_glow);
          }
        } else {
          target.style.setProperty('--primary-btn-text', '#ffffff');
          target.style.setProperty('--accent', 'hsl(188, 55%, 38%)');
          target.style.setProperty('--accent-glow', 'hsla(188, 55%, 38%, 0.15)');
        }
      });

      // Dynamically morph browser tab favicon to match selected hotel brand design system
      if (activeBrand.primary_color) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.type = 'image/svg+xml';
        
        const brandColor = activeBrand.primary_color;
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22c1-4 1-8 0-12" />
          <path d="M5 22c2-.5 12-.5 14 0" />
          <path d="M12 10c-3-2-7-1-9 2" />
          <path d="M12 10c3-2 7-1 9 2" />
          <path d="M12 10c-4 .5-8 3-9 7" />
          <path d="M12 10c4 .5 8 3 9 7" />
          <path d="M12 10c-1.5-4-5-6-8-6" />
          <path d="M12 10c1.5-4 5-6 8-6" />
        </svg>`;
        link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      }
    } else {
      const fontLink = document.getElementById('dynamic-brand-font');
      if (fontLink) fontLink.remove();

      targets.forEach(target => {
        target.style.removeProperty('--primary');
        target.style.removeProperty('--primary-glow');
        target.style.removeProperty('--font-sans');
        target.style.removeProperty('--border-color');
        target.style.removeProperty('--border-glow');
        target.style.removeProperty('--msg-user-bg');
        target.style.removeProperty('--msg-agent-bg');
        target.style.removeProperty('--accent');
        target.style.removeProperty('--accent-glow');
        target.style.removeProperty('--primary-btn-text');
      });
    }
  }, [tenantBrand, view, integrationTab, manualHotel, tenantsList, guestId]);

  // Generate secure token for Operator flyer on-the-fly
  useEffect(() => {
    if (isSecureMode && welcomeCardGuestId) {
      fetch(`${API_BASE}/api/generate-secure-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: welcomeCardGuestId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOperatorFlyerToken(data.token);
        }
      })
      .catch(err => console.error("Error generating secure token for flyer:", err));
    }
  }, [welcomeCardGuestId, isSecureMode]);

  const addLog = (message) => {
    setAgentLogs((prev) => [...prev, message]);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // 1. Add user message to UI
    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      addLog(`[MESSAGE] Guest [${guestId}] sent message: "${text}"`);
      // 2. Call backend chat endpoint
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
          message: text,
          history: messages
        })
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      // 3. Update agent chat logs in operator panel
      if (data.logs && data.logs.length > 0) {
        setAgentLogs((prev) => [...prev, ...data.logs]);
      }

      // 4. Add agent response to chat
      setMessages((prev) => [...prev, { role: 'model', text: data.response }]);
      addLog(`[AGENT] Agent responded to [${guestId}]: "${data.response.substring(0, 60)}..."`);
      
      // Refresh DB state in UI
      await fetchStatus(guestId);
    } catch (error) {
      console.error("Chat error:", error);
      addLog(`[ERROR] Chat API Error: ${error.message}`);
      setMessages((prev) => [...prev, { 
        role: 'model', 
        text: "I'm having a little trouble communicating with the island server right now, my friend. Let's try that again. No stress!" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (payload) => {
    setLoading(true);
    addLog(`[WEATHER] Simulating Weather Event: Setting ${payload.date} to ${payload.weather} (${payload.alert})`);
    try {
      const res = await fetch(`${API_BASE}/api/simulate-weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          guest_id: guestId
        })
      });

      if (!res.ok) throw new Error("Simulation request failed");
      const data = await res.json();

      // Update agent logs
      if (data.agent_logs && data.agent_logs.length > 0) {
        setAgentLogs((prev) => [...prev, ...data.agent_logs]);
      }

      // Post weather event announcement to chat widget
      if (data.agent_response) {
        setMessages((prev) => [...prev, { role: 'model', text: data.agent_response }]);
        addLog(`[AGENT] Weather Response Triggered: "${data.agent_response.substring(0, 60)}..."`);
      }

      await fetchStatus(guestId);
    } catch (error) {
      console.error("Simulation error:", error);
      addLog(`[ERROR] Weather Shift Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondProposal = async (bookingId, date, alternativeTourId, accepted) => {
    setLoading(true);
    addLog(`👉 Decision: ${accepted ? 'CONFIRMED' : 'DECLINED'} rescheduling proposal for booking ${bookingId}`);
    try {
      const res = await fetch(`${API_BASE}/api/respond-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
          booking_id: bookingId,
          new_date: date,
          alternative_tour_id: alternativeTourId,
          accepted
        })
      });

      if (!res.ok) throw new Error("Proposal response failed");
      const data = await res.json();

      if (accepted) {
        addLog(`[SUCCESS] Booking updated and slots shifted successfully!`);
        setMessages((prev) => [...prev, { 
          role: 'model', 
          text: "Respect, my friend! I have processed the change in DynamoDB, updated your booking slots, and generated your new official travel receipt below. Pura vida!" 
        }]);
        setShowItineraryModal(true);
      } else {
        addLog(`[INFO] Proposal declined. Booking status preserved.`);
        setMessages((prev) => [...prev, { 
          role: 'model', 
          text: "No worries at all! I have kept your snorkeling trip. Let's hope for clear skies. Feel free to ask if you want to change anything else, respect!" 
        }]);
      }

      await fetchStatus(guestId);
    } catch (error) {
      console.error("Proposal error:", error);
      addLog(`[ERROR] Proposal Update Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedback = async (text) => {
    try {
      const response = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          guest_id: guestId || null,
          view: view || null
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(lang === 'es' ? "¡Gracias por sus comentarios! Se han registrado de forma permanente." : "Thank you for your feedback! It has been logged permanently.");
      } else {
        console.error("Feedback submission failed:", data);
        alert(lang === 'es' ? "Error al enviar los comentarios." : "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
      alert(lang === 'es' ? "Error al enviar los comentarios." : "Failed to submit feedback.");
    }
  };

  const handleReset = async () => {
    setLoading(true);
    addLog("🔄 Resetting database to initial seeded state...");
    try {
      const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      if (!res.ok) throw new Error("Reset request failed");
      
      setMessages([]);
      setAgentLogs(['Simulation environment initialized. Ready for weather events.']);
      addLog("[SUCCESS] Database reset completed successfully!");
      
      await fetchStatus(guestId);
    } catch (error) {
      console.error("Reset error:", error);
      addLog(`[ERROR] Database Reset Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePMSSync = async (pmsPayload, skipRedirect = false) => {
    setLoading(true);
    addLog(`[PMS] PMS Webhook: Syncing reservation for new guest '${pmsPayload.name}'...`);
    try {
      const res = await fetch(`${API_BASE}/api/pms/sync-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pmsPayload)
      });
      if (!res.ok) throw new Error("PMS synchronization request failed");
      const data = await res.json();
      addLog(`[SUCCESS] PMS Synced: ${data.message}`);
      setTenantBrand(null);
      setGuestId(pmsPayload.guest_id);
      await fetchStatus(pmsPayload.guest_id);
      if (!skipRedirect) {
        setView('guest');
      }
    } catch (error) {
      console.error("PMS sync error:", error);
      addLog(`[ERROR] PMS Webhook Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pre-Arrival Messaging Helper Functions
  const activeMessagingGuest = (guests || []).find(g => g && g._id === messagingGuestId) || (guests || [])[0] || {
    _id: 'g_mock_99',
    name: 'Sophia Loren',
    phone: '+1-202-555-0143',
    hotel_id: tenantBrand?._id || 'hotel_lacoralina',
    hotel_name: tenantBrand?.name || 'La Coralina Island House',
    stay_start: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    stay_end: new Date(Date.now() + 518400000).toISOString().split('T')[0],
    secure_token: 'mock_secure_token_abc123'
  };

  const getMagicLink = (guest) => {
    if (!guest) return window.location.origin;
    if (guest.secure_token) {
      return `${window.location.origin}/?token=${guest.secure_token}`;
    }
    return `${window.location.origin}/?guest_id=${guest._id || ''}&secure=true`;
  };

  const getWhatsAppMessageText = (guest) => {
    if (!guest) return '';
    const magicLink = getMagicLink(guest);
    let text = `*Welcome to Paradise, ${guest.name || 'Guest'}!* \n\nYour overwater concierge is ready at *${guest.hotel_name || 'La Coralina Island House'}* for your upcoming stay (${guest.stay_start || ''} to ${guest.stay_end || ''}).\n\nNo app downloads or passwords required! Scan or tap below to unlock your digital itinerary, live weather butler, and personalized island recommendations: \n*Get Started:* ${magicLink}`;
    
    if (transferIncluded) {
      text += `\n\n*Private Boat Transfer:* We notice your arrival water-taxi shuttle from Almirante hasn't been coordinated yet. Tap your portal above to secure your transfer and avoid island delays!`;
    }
    
    if (weatherNoteIncluded) {
      text += `\n\n[ADVISORY] *Tropical Rain:* Bocas is expecting mild tropical rain showers. Don't worry—we've pre-stocked your bungalow with rain gear and umbrellas, and pre-booked premium indoor spa options for your check-in day!`;
    }
    
    return text;
  };

  const getEmailSubjectText = (guest) => {
    return `Your Digital Concierge is Ready! Welcome to ${guest.hotel_name}`;
  };

  const getEmailHtmlSource = (guest) => {
    const primaryColor = tenantBrand?.primary_color || 'hsl(45, 100%, 50%)';
    const logoImg = tenantBrand?.logo_url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=120&h=120&q=80';
    const guestLink = getMagicLink(guest);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Digital Concierge is Ready</title>
</head>
<body style="margin:0; padding:0; background-color:#0b0f19; font-family:'Helvetica Neue', Arial, sans-serif; color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19; padding:40px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <!-- Brand Header -->
          <tr>
            <td align="center" style="background-color:#1f2937; padding:30px 20px; border-bottom:2px solid ${primaryColor};">
              <img src="${logoImg}" alt="${guest.hotel_name}" style="height:50px; border-radius:50%; margin-bottom:10px; display:inline-block; border:1.5px solid ${primaryColor};">
              <h1 style="font-size:24px; font-weight:700; margin:0; color:#ffffff; font-family:'Playfair Display', Georgia, serif; letter-spacing:0.03em;">${guest.hotel_name}</h1>
              <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:${primaryColor}; font-weight:600;">Digital Concierge Experience</span>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="font-size:20px; font-weight:600; margin-top:0; color:#ffffff;">Dear ${guest.name},</h2>
              <p style="font-size:15px; line-height:1.6; color:#9ca3af; margin-bottom:24px;">
                We are thrilled to welcome you to the beautiful waters of Bocas del Toro soon! Your upcoming tropical escape is fully set and we want to ensure your stay is absolutely seamless.
              </p>
              
              <!-- Stay Schedule Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; margin-bottom:30px; text-align:center;">
                <tr>
                  <td width="50%" style="padding:15px; border-right:1px solid rgba(255,255,255,0.06);">
                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#9ca3af; display:block; margin-bottom:4px;">Check-In Date</span>
                    <strong style="font-size:16px; color:#ffffff;">${guest.stay_start}</strong>
                  </td>
                  <td width="50%" style="padding:15px;">
                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#9ca3af; display:block; margin-bottom:4px;">Check-Out Date</span>
                    <strong style="font-size:16px; color:#ffffff;">${guest.stay_end}</strong>
                  </td>
                </tr>
              </table>

              ${transferIncluded ? `
              <!-- Private Transfer Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${primaryColor}; background-color:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <h3 style="font-size:15px; font-weight:700; margin:0 0 6px 0; color:#ffffff;">Coordinate Private Boat Transfers</h3>
                    <p style="font-size:13.5px; line-height:1.5; color:#9ca3af; margin:0;">
                      We noticed your overwater water-taxi shuttle from Almirante to the resort has not been scheduled yet. Open your digital portal below to coordinate your shuttle times live and avoid tropical arrival delays!
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${weatherNoteIncluded ? `
              <!-- Climate Smart Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #059669; background-color:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <h3 style="font-size:15px; font-weight:700; margin:0 0 6px 0; color:var(--primary);">Climate-Smart Preparedness</h3>
                    <p style="font-size:13.5px; line-height:1.5; color:#9ca3af; margin:0;">
                      Our sensors are tracking brief tropical rain showers during your week. No worries—we have pre-stocked your villa with premium rain-gear, and pre-scheduled priority access to indoor activities and spa therapies!
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Call to Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px; margin-bottom:30px; text-align:center;">
                <tr>
                  <td align="center">
                    <a href="${guestLink}" target="_blank" style="background-color:${primaryColor}; color:#000000; font-size:15px; font-weight:700; text-decoration:none; padding:15px 35px; border-radius:30px; display:inline-block; box-shadow:0 4px 15px rgba(255,255,255,0.15); transition:transform 0.2s ease;">
                      Unlock Personalized Digital Concierge
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px; line-height:1.6; color:#9ca3af; margin-top:20px; text-align:center;">
                No logins, passwords, or native app installs required. Simply click to open your pre-authenticated guest portal.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#111827; padding:20px; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
              <p style="font-size:12px; color:#6b7280; margin:0;">
                © ${new Date().getFullYear()} ${guest.hotel_name}. All rights reserved.
              </p>
              <p style="font-size:11px; color:#4b5563; margin-top:6px;">
                Delivered via secure white-label automation by Rain or Shine.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const getDispatchItems = () => {
    const items = [];
    const activeGuests = (guests || []).length > 0 ? (guests || []) : (activeMessagingGuest ? [activeMessagingGuest] : []);

    activeGuests.forEach(g => {
      if (!g) return;
      // 1. Boat Shuttle Pick-up Dispatch
      items.push({
        id: `shuttle_${g._id}`,
        provider: 'Captain Jose',
        role: 'Water-Taxi Captain',
        phone: '+507-6411-9822',
        type: 'shuttle',
        subject: `Shuttle Pick-up: ${g.name || 'Guest'}`,
        message: `Shuttle Pick-up Confirmed: Guest ${g.name || 'Guest'} arriving Almirante on ${g.stay_start || 'arrival day'} at 11:30 AM for transfer to ${g.hotel_name || 'La Coralina'}.`,
        status: notifiedProviders[`shuttle_${g._id}`] || 'pending'
      });

      // 2. Activity Dispatches
      const guestBookings = (bookings || []).filter(b => b && String(b.guest_id) === String(g._id));
      guestBookings.forEach(b => {
        if (!b) return;
        const tour = (tours || []).find(t => t && t._id === b.tour_id);
        if (!tour) return;

        let provider = 'Sophia';
        let role = 'Wellness Coordinator';
        let phone = '+507-6322-1144';

        const tourNameLower = (tour.name || '').toLowerCase();
        if (tour._id === 't1' || tourNameLower.includes('snorkel') || tourNameLower.includes('reef')) {
          provider = 'Captain Marcos';
          role = 'Tour Boat Captain';
          phone = '+507-6588-4411';
        } else if (tour._id === 't4' || tourNameLower.includes('chocolate') || tourNameLower.includes('finca')) {
          provider = 'Carlos';
          role = 'Chocolate Farm Operator';
          phone = '+507-6811-5500';
        } else if (tour.type === 'indoor') {
          provider = 'Sophia';
          role = 'Wellness & Spa Coordinator';
          phone = '+507-6322-1144';
        }

        // Active Booking Dispatch
        items.push({
          id: `booking_${b._id}`,
          provider,
          role,
          phone,
          type: 'booking',
          subject: `📌 Booking: ${tour.name || 'Custom Tour'}`,
          message: `📌 New Booking Alert: Guest ${g.name || 'Guest'} scheduled for "${tour.name || 'Custom Tour'}" on ${b.date || 'scheduled day'} (${b.slot || 'scheduled slot'}) at ${tour.location || 'Bocas'}. Price: $${b.price || tour.price || '0'}. Please lock reservation slot.`,
          status: notifiedProviders[`booking_${b._id}`] || 'pending'
        });

        // Climate advisory dispatch
        const log = (logistics || []).find(l => l && l.date === b.date);
        if (log && (log.alert === 'rain_warning' || log.weather === 'Rainy' || log.weather === 'Heavy Rain')) {
          items.push({
            id: `weather_alert_${b._id}`,
            provider,
            role,
            phone,
            type: 'weather',
            subject: `[WEATHER] Alert: ${tour.name || 'Custom Excursion'}`,
            message: `Weather Advisory: Rain forecast on ${b.date || 'scheduled day'}. Excursion "${tour.name || 'Custom Excursion'}" for Guest ${g.name || 'Guest'} is flagged for indoor weather fallback or reschedule.`,
            status: notifiedProviders[`weather_alert_${b._id}`] || 'pending'
          });
        }
      });
    });

    return items;
  };

  const handleNotifyProvider = (dispatchId, method, providerName, messageText) => {
    const dateStr = new Date().toLocaleTimeString();
    addLog(`📲 [${dateStr}] Dispatch via ${method.toUpperCase()} to ${providerName}: "${messageText.slice(0, 45)}..."`);

    setNotifiedProviders(prev => ({
      ...prev,
      [dispatchId]: method
    }));

    if (method === 'whatsapp') {
      setPushToastText(`[MESSAGE] SMS/WA sent to ${providerName}: "${messageText}"`);
    } else {
      setPushToastText(`[API] Webhook API synced to ${providerName}: Payload delivered. Status: ACKNOWLEDGED.`);
    }
    setShowPushToast(true);
    setTimeout(() => {
      setShowPushToast(false);
    }, 4500);
  };

  const handleAssignCaptain = async (bookingId, captainId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/operator/assign-captain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          captain_id: captainId || null
        })
      });
      if (!res.ok) throw new Error('Failed to assign captain');
      const data = await res.json();
      
      const dateStr = new Date().toLocaleTimeString();
      const capName = captains.find(c => c._id === captainId)?.name || 'None (Unassigned)';
      addLog(`[Assign] [${dateStr}] Assigned Captain ${capName} to Booking ${bookingId}`);
      
      setPushToastText(`Captain successfully updated to: ${capName}`);
      setShowPushToast(true);
      setTimeout(() => setShowPushToast(false), 4500);

      // Refresh data
      await fetchStatus(guestId);
    } catch (err) {
      console.error(err);
      alert('Error updating captain assignment.');
    } finally {
      setLoading(false);
    }
  };

  const currentActiveBrand = tenantBrand;

  return (
    <div className="app-container">
      {/* Live Push Notification Simulation Toast */}
      {showPushToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1.5px solid var(--primary)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backdropFilter: 'blur(10px)',
          animation: 'slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideInRight {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}} />
          <div style={{ background: '#059669', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Simulation Triggered</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', lineHeight: '1.3' }}>{pushToastText}</span>
          </div>
        </div>
      )}
      {/* Premium Header with Navigation */}
      <header className="app-header">
        {isGuestViewOnly ? (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h1 className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                {currentActiveBrand?.logo_url && !logoErrors[currentActiveBrand._id || 'active'] ? (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1.5px solid var(--primary)',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    flexShrink: 0
                  }}>
                    <img 
                      src={currentActiveBrand.logo_url} 
                      alt={currentActiveBrand.name || 'Brand Logo'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => {
                        setLogoErrors(prev => ({ ...prev, [currentActiveBrand._id || 'active']: true }));
                      }}
                    />
                  </div>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}>
                    <path d="M12 22c1-4 1-8 0-12" />
                    <path d="M5 22c2-.5 12-.5 14 0" />
                    <path d="M12 10c-3-2-7-1-9 2" />
                    <path d="M12 10c3-2 7-1 9 2" />
                    <path d="M12 10c-4 .5-8 3-9 7" />
                    <path d="M12 10c4 .5 8 3 9 7" />
                    <path d="M12 10c-1.5-4-5-6-8-6" />
                    <path d="M12 10c1.5-4 5-6 8-6" />
                  </svg>
                )}
                {tenantBrand?.name || (guests || []).find(g => g && g._id === guestId)?.hotel_name || 'La Coralina Island House'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                Personalized Digital Eco-Concierge
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isSecureModeActive && (
                <button 
                  onClick={() => {
                    const newUrl = window.location.pathname + '?view=operator';
                    window.history.pushState({}, '', newUrl);
                    setIsGuestViewOnly(false);
                    setView('operator');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-glow)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Back to Operator Dashboard
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--primary-glow)', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                {isSecureModeActive ? 'SECURE CLIENT VIEW' : 'GUEST PORTAL ACTIVE'}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <h1 className="app-title" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigateToView('landing')}>
                {currentActiveBrand?.logo_url && !logoErrors[currentActiveBrand._id || 'active'] ? (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1.5px solid var(--primary)',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    flexShrink: 0
                  }}>
                    <img 
                      src={currentActiveBrand.logo_url} 
                      alt={currentActiveBrand.name || 'Brand Logo'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => {
                        setLogoErrors(prev => ({ ...prev, [currentActiveBrand._id || 'active']: true }));
                      }}
                    />
                  </div>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}>
                    <path d="M12 22c1-4 1-8 0-12" />
                    <path d="M5 22c2-.5 12-.5 14 0" />
                    <path d="M12 10c-3-2-7-1-9 2" />
                    <path d="M12 10c3-2 7-1 9 2" />
                    <path d="M12 10c-4 .5-8 3-9 7" />
                    <path d="M12 10c4 .5 8 3 9 7" />
                    <path d="M12 10c-1.5-4-5-6-8-6" />
                    <path d="M12 10c1.5-4 5-6 8-6" />
                  </svg>
                )}
                Rain or Shine
              </h1>
              <p style={{ color: 'var(--text-muted)', opacity: 1, fontSize: '0.85rem', margin: 0, display: 'flex' }}>
                {"Que Siga La Rumba!".split('').map((char, idx) => (
                  <span
                    key={idx}
                    className="wave-char"
                    style={{
                      animationDelay: `${idx * 0.08}s`
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </p>
            </div>

            {/* Navigation Tabs */}
            <nav className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
              <button className={`nav-link ${view === 'landing' ? 'active' : ''}`} onClick={() => navigateToView('landing')}>
                {lang === 'es' ? 'Nosotros' : 'About'}
              </button>
              
              {/* Unified Portals Dropdown */}
              <div className="custom-dropdown-container" ref={portalsDropdownRef} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setPortalsDropdownOpen(!portalsDropdownOpen)}
                  className={`nav-link ${['guest', 'operator', 'captain'].includes(view) ? 'active' : ''} ${portalsDropdownOpen ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    padding: '10px 0',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                >
                  <span>{lang === 'es' ? 'Portales' : 'Portals'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: portalsDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--primary)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {portalsDropdownOpen && (
                  <div className="custom-dropdown-menu" style={{ right: 0, left: 'auto', transformOrigin: 'top right' }}>
                    <div style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                      {lang === 'es' ? 'Seleccionar Portal' : 'Select Portal'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => {
                          navigateToView('guest');
                          setPortalsDropdownOpen(false);
                        }}
                        style={{
                          background: view === 'guest' ? 'var(--primary-glow)' : 'transparent',
                          color: view === 'guest' ? 'var(--primary)' : 'var(--text-primary)',
                          border: 'none',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          textAlign: 'left',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease',
                          fontFamily: 'var(--font-sans)',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          if (view !== 'guest') e.currentTarget.style.background = 'var(--bg-card-nested)';
                        }}
                        onMouseLeave={(e) => {
                          if (view !== 'guest') e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: view === 'guest' ? 'var(--primary)' : 'var(--text-muted)' }}>
                          <rect x="3" y="8" width="18" height="12" rx="2" ry="2" />
                          <path d="M16 8V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
                          <line x1="12" y1="12" x2="12" y2="16" />
                          <line x1="8" y1="14" x2="16" y2="14" />
                        </svg>
                        <span>{lang === 'es' ? 'Portal del Huésped' : 'Guest Portal'}</span>
                        {view === 'guest' && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)' }}>●</span>}
                      </button>

                      <button
                        onClick={() => {
                          navigateToView('operator');
                          setPortalsDropdownOpen(false);
                        }}
                        style={{
                          background: view === 'operator' ? 'var(--primary-glow)' : 'transparent',
                          color: view === 'operator' ? 'var(--primary)' : 'var(--text-primary)',
                          border: 'none',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          textAlign: 'left',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease',
                          fontFamily: 'var(--font-sans)',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          if (view !== 'operator') e.currentTarget.style.background = 'var(--bg-card-nested)';
                        }}
                        onMouseLeave={(e) => {
                          if (view !== 'operator') e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: view === 'operator' ? 'var(--primary)' : 'var(--text-muted)' }}>
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        <span>{lang === 'es' ? 'Portal del Operador' : 'Operator Portal'}</span>
                        {view === 'operator' && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)' }}>●</span>}
                      </button>

                      <button
                        onClick={() => {
                          navigateToView('captain');
                          setPortalsDropdownOpen(false);
                        }}
                        style={{
                          background: view === 'captain' ? 'var(--primary-glow)' : 'transparent',
                          color: view === 'captain' ? 'var(--primary)' : 'var(--text-primary)',
                          border: 'none',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          textAlign: 'left',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease',
                          fontFamily: 'var(--font-sans)',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          if (view !== 'captain') e.currentTarget.style.background = 'var(--bg-card-nested)';
                        }}
                        onMouseLeave={(e) => {
                          if (view !== 'captain') e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: view === 'captain' ? 'var(--primary)' : 'var(--text-muted)' }}>
                          <circle cx="12" cy="5" r="3" />
                          <line x1="12" y1="8" x2="12" y2="20" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                          <path d="M5 12c0 3.87 3.13 7 7 7s7-3.13 7-7" />
                          <path d="M3 10l2 2 2-2" />
                          <path d="M21 10l-2 2-2-2" />
                        </svg>
                        <span>{lang === 'es' ? 'Portal de Mando' : 'Captain Portal'}</span>
                        {view === 'captain' && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)' }}>●</span>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className={`nav-link ${view === 'integrations' ? 'active' : ''}`} onClick={() => navigateToView('integrations')}>
                {lang === 'es' ? 'Integraciones' : 'Business Integrations'}
              </button>
            </nav>

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Compact EN/ES Toggle Slider (No Emojis) */}
              <div 
                onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                style={{
                  background: 'var(--bg-card-nested, rgba(15, 23, 42, 0.15))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '24px',
                  padding: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  position: 'relative',
                  width: '96px',
                  height: '28px',
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
                    top: '2px',
                    left: '2px',
                    bottom: '2px',
                    width: 'calc(50% - 2px)',
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
                  justifyContent: 'center'
                }}>
                  EN
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
                  justifyContent: 'center'
                }}>
                  ES
                </span>
              </div>

              {/* Unified Operator Session Capsule (Resort + Logout) */}
              {operatorHotelId && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--bg-card-nested, rgba(15, 23, 42, 0.15))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '24px',
                  height: '28px',
                  padding: '0 4px 0 10px',
                  gap: '8px',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, color: 'var(--text-primary)' }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {operatorHotelName}
                  </span>
                  <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }}></div>
                  <button
                    onClick={() => {
                      transitionState(() => {
                        safeLocalStorageRemove('operatorHotelId');
                        safeLocalStorageRemove('operatorHotelName');
                        setOperatorHotelId(null);
                        setOperatorHotelName(null);
                      });
                    }}
                    title="Log Out"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      padding: '0 8px',
                      height: '20px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>Log Out</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Database Connection Badge */}
              <div style={{ 
                background: isRealDynamo ? 'rgba(5, 150, 105, 0.05)' : 'var(--primary-glow)', 
                color: isRealDynamo ? '#10b981' : 'var(--primary)', 
                border: `1px solid ${isRealDynamo ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`, 
                padding: '0 10px', 
                borderRadius: '24px', 
                height: '28px',
                fontSize: '0.72rem', 
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                letterSpacing: '0.04em',
                flexShrink: 0
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isRealDynamo ? '#10b981' : 'var(--primary)',
                  boxShadow: isRealDynamo ? '0 0 6px #10b981' : 'none'
                }}></span>
                <span>{isRealDynamo ? 'AWS LIVE' : 'SANDBOX DB'}</span>
              </div>

              {/* Feedback Button */}
              <button 
                onClick={() => {
                  const feedback = prompt(lang === 'es' ? "¡Valoramos su opinión! Comparta sus comentarios sobre su experiencia en IslandFlow:" : "We value your input! Share your feedback on your IslandFlow experience:");
                  if (feedback) {
                    handleSendFeedback(feedback);
                  }
                }}
                title={lang === 'es' ? "Compartir comentarios" : "Share Feedback on your Experience"}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '0 10px',
                  borderRadius: '24px',
                  height: '28px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.04em',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--primary-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{lang === 'es' ? 'COMENTARIOS' : 'FEEDBACK'}</span>
              </button>
            </div>
          </>
        )}
      </header>

      {/* Guest Profile Switcher banner (visible in portals to switch contexts) */}
      {((view === 'guest' && !isGuestViewOnly) || view === 'operator') && (
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '8px 16px', 
          marginBottom: '12px', 
          background: 'var(--panel-bg)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Left: Badge and text/Active status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ 
              background: 'var(--primary-glow)', 
              color: 'var(--primary)', 
              border: '1px solid var(--border-color)',
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              DEMO SANDBOX
            </span>
            <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Reservation:</span>
              <strong style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {(guests || []).find(g => g && g._id === guestId)?.name || 'Dorien Van Den Abbeele'} ({guestId})
              </strong>
            </div>
          </div>

          {/* Right: Dropdown switcher & Launch button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Switch Guest:</span>
              <select
                value={guestId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const g = (guests || []).find(x => x && x._id === selectedId);
                  if (!g) return;
                  setToken(null);
                  setIsSecureModeActive(false);
                  setIsGuestViewOnly(false);
                  setTenantBrand(null);
                  setGuestId(g._id);
                  setWelcomeCardGuestId(g._id);
                  setMessages([]);
                  setBookings([]);
                  setItineraryMarkdown('');
                  if (g.hotel_id) {
                    setManualHotel(g.hotel_id);
                  } else if (DEFAULT_GUEST_BRANDS[g._id]) {
                    setManualHotel(DEFAULT_GUEST_BRANDS[g._id]);
                  }
                }}
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  padding: '3px 20px 3px 8px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '130px'
                }}
              >
                {(guests || []).map(g => {
                  if (!g) return null;
                  return (
                    <option key={g._id} value={g._id} style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                      {g.name} ({g._id})
                    </option>
                  );
                })}
              </select>
              {!['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'].includes(guestId) && (
                <button
                  onClick={(e) => handleDeleteGuest(guestId, e)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE}/api/generate-secure-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guest_id: guestId })
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.token) {
                      window.open(`${window.location.origin}/?token=${data.token}`, '_blank');
                    } else {
                      window.open(`${window.location.origin}/?guest_id=${guestId}&secure=true`, '_blank');
                    }
                  } else {
                    window.open(`${window.location.origin}/?guest_id=${guestId}&secure=true`, '_blank');
                  }
                } catch (e) {
                  window.open(`${window.location.origin}/?guest_id=${guestId}&secure=true`, '_blank');
                }
              }}
              style={{
                background: 'var(--primary-glow)',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary-glow)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Portal
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Render Landing Page View */}
      {view === 'landing' && (
        <div>
          {/* Hero Section */}
          <div className="landing-hero">
            <h2 className="landing-tagline">Eco-Tourism Coordinator for Bocas del Toro</h2>
            <p className="landing-intro">
              Moving beyond basic text chat. A dedicated local travel agent that actively manages schedules, monitors live weather conditions, automatically proposes indoor reschedules during storms, and commits verified transactions directly to Amazon DynamoDB.
            </p>
          </div>

          {/* Role selection Cards */}
          <div className="role-selector-grid">
            <div className="glass-card role-card">
              <div className="role-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="role-title">Guest Portal</h3>
              <p className="role-desc">
                Log in as a tourist in paradise. View your custom stay timeline, message the local concierge in real-time, instantly approve weather reschedule cards, and print your official travel itinerary receipt.
              </p>
              <button className="btn-primary" onClick={() => setView('guest')}>
                Enter Guest Portal
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            <div className="glass-card role-card">
              <div className="role-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3 className="role-title">Operator Portal</h3>
              <p className="role-desc">
                Hotel and lodge logistics management. Trigger custom weather changes, review current calendar listings, and inspect the real-time agent log console to view underlying MCP execution sequences.
              </p>
              <button className="btn-primary" onClick={() => setView('operator')}>
                Enter Operator Dashboard
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            <div className="glass-card role-card">
              <div className="role-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3ecdc6' }}>
                  <path d="M2 12h20M12 2v20" />
                  <circle cx="12" cy="12" r="6" />
                </svg>
              </div>
              <h3 className="role-title">Captain Portal</h3>
              <p className="role-desc">
                PWA mobile dispatch dashboard for local boat captains. View assigned tourist manifests, report sea-swell status, and broadcast real-time rain/safety reports back to the hotel.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <select 
                  value={captainId} 
                  onChange={(e) => setCaptainId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {captains.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.boat})</option>
                  ))}
                  {captains.length === 0 && (
                    <>
                      <option value="cap1">Captain Luis (La Estrella)</option>
                      <option value="cap2">Captain Marco (Isla Bonita)</option>
                      <option value="cap3">Captain Rosa (Coral Queen)</option>
                    </>
                  )}
                </select>
                <button className="btn-primary" onClick={() => setView('captain')}>
                  Enter Captain Portal
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Real-World Dispatch & PWA Onboarding Workflow Guide */}
          <div className="landing-features" style={{ marginTop: '50px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
            <h3 className="section-title">Real-World Dispatch & Onboarding Workflow Guide</h3>
            <p className="landing-intro" style={{ maxWidth: '750px', margin: '-10px auto 40px auto', fontSize: '0.95rem' }}>
              Designed for luxury overwater resorts (like Nayara Bocas or La Coralina). This guide illustrates how hotels onboard staff, how boat captains install the app in seconds, and how guests stay synced.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              maxWidth: '1200px',
              margin: '0 auto',
              textAlign: 'left'
            }}>
              {/* Step 1: Hotel Operator Setup */}
              <div className="glass-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#3ecdc6', color: '#000000', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>
                  STEP 1
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <div style={{ color: 'var(--accent, #3ecdc6)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Hotel Desk Dispatch</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  The front desk operator logs into the <strong>Operator Portal</strong>, defines boat capacities, and maps local captains. <span></span>
                </p>
                <div style={{ background: 'var(--bg-card-nested)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--accent, #3ecdc6)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Operational Action:</span>
                  Sync guest details, assign a boat/captain, and click <strong>"Print Welcome Flyer"</strong> to produce a personalized card with a secure room check-in QR code.
                </div>
              </div>

              {/* Step 2: Boat Captain Mobile PWA */}
              <div className="glass-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#0ea5e9', color: '#ffffff', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>
                  STEP 2
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <div style={{ color: 'var(--primary)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Captain PWA Install</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  Captains don't need App Store downloads! They open the URL on mobile or scan a setup code, then tap <strong>"Add to Home Screen"</strong> for full PWA integration.
                </p>
                <div style={{ background: 'var(--bg-card-nested)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Operational Action:</span>
                  Open Captain Portal, tap install, select preferred language (<strong>Bilingual Switcher 🇪🇸 / 🇬🇧</strong>), accept dispatches, and log real-time sea swell reports.
                </div>
              </div>

              {/* Step 3: Guest Mobile Companion */}
              <div className="glass-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#a855f7', color: '#ffffff', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>
                  STEP 3
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <div style={{ color: '#a855f7' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Guest Activation</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  Guests scan the room welcome QR code on their device. The secure token authorizes their timeline and skins the interface with the resort's brand.
                </p>
                <div style={{ background: 'var(--bg-card-nested)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: '#a855f7', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Operational Action:</span>
                  View active schedule, chat instantly with our Google ADK concierge, request tour booking extensions, and add custom timeline markers offline.
                </div>
              </div>

              {/* Step 4: Closed-Loop Weather Swaps */}
              <div className="glass-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#f59e0b', color: '#000000', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>
                  STEP 4
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <div style={{ color: 'var(--warning, #f59e0b)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Bilingual Closed Loop</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  A closed-loop dispatch ecosystem. If captains broadcast an English/Spanish weather warning, dispatches re-route immediately.
                </p>
                <div style={{ background: 'var(--bg-card-nested)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--warning, #f59e0b)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Operational Action:</span>
                  Captains flag unsafe seas (in Spanish) &rarr; Front desk monitors live alerts &rarr; Gemini backend drafts reschedules &rarr; Guest confirms swap in 1-tap.
                </div>
              </div>
            </div>
          </div>
          <div className="landing-features">
            <h3 className="section-title">Key Capabilities</h3>
            <div className="features-grid">
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                  <div className="feature-title">Afro-Caribbean Hospitality</div>
                </div>
                <div className="feature-desc">Natural island-hospitable tone using welcoming Creole/Caribbean expressions without sacrificing professional clarity.</div>
              </div>
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                      <polyline points="13 11 9 17 12 17 10 23" />
                    </svg>
                  </div>
                  <div className="feature-title">Real-Time Weather Dispatch</div>
                </div>
                <div className="feature-desc">Active alert monitoring. When storms threaten scheduled outdoor bookings, the coordinator triggers replanning pipelines automatically.</div>
              </div>
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="feature-title">Human-in-the-Loop Safety</div>
                </div>
                <div className="feature-desc">The AI never forces updates. It proposes a swap card, requiring your approval before updating booking documents or capacities.</div>
              </div>
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5V19c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                  </div>
                  <div className="feature-title">Live Amazon DynamoDB Transactions</div>
                </div>
                <div className="feature-desc">Transactions are safely committed back to Amazon DynamoDB, accurately adjusting available slots and creating official itinerary receipts.</div>
              </div>
            </div>
          </div>

          {/* Interactive System Architecture Section */}
          <div className="landing-features" style={{ marginTop: '80px', borderTop: '1px solid var(--border-color)', paddingTop: '60px' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
              System Architecture & Developer Docs
            </h3>
            <p className="landing-intro" style={{ maxWidth: '750px', margin: '-20px auto 40px auto', fontSize: '0.95rem' }}>
              Explore our native Google Cloud multi-tenant SaaS integration. Click any layer on the left blueprint to inspect the endpoints, core AI agents, and underlying Model Context Protocol (MCP) tools in the right panel.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '30px', maxWidth: '1100px', margin: '0 auto', textAlign: 'left' }}>
              {/* Left Column: Interactive System Stack Blueprint */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  System Stack Layers
                </div>

                {/* Layer Card 1: Frontend */}
                <div 
                  className="glass-card" 
                  onClick={() => setArchActiveLayer('frontend')}
                  style={{ 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    border: archActiveLayer === 'frontend' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: archActiveLayer === 'frontend' ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.01)',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: archActiveLayer === 'frontend' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>1. Frontend Portals</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vite + React Single-Page SaaS</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Layer Card 2: FastAPI SaaS Gateway */}
                <div 
                  className="glass-card" 
                  onClick={() => setArchActiveLayer('gateway')}
                  style={{ 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    border: archActiveLayer === 'gateway' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: archActiveLayer === 'gateway' ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.01)',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: archActiveLayer === 'gateway' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>2. FastAPI SaaS Gateway</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Central REST API Routing Hub</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', color: '#6366f1' }}>
                      REST API
                    </span>
                  </div>
                </div>

                {/* Layer Card 3: Google ADK Agent Core */}
                <div 
                  className="glass-card" 
                  onClick={() => setArchActiveLayer('brain')}
                  style={{ 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    border: archActiveLayer === 'brain' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: archActiveLayer === 'brain' ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.01)',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: archActiveLayer === 'brain' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a10 10 0 0 1 7.54 16.59c-.44.53-.44 1.12 0 1.66A2 2 0 0 0 21 22H3a2 2 0 0 0 1.46-1.75c.44-.54.44-1.13 0-1.66A10 10 0 0 1 12 2z" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>3. Google ADK Agent Core</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BocasEcoConcierge / Gemini Orchestrator</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#14b8a6' }}>
                      GOOGLE ADK
                    </span>
                  </div>
                </div>

                {/* Layer Card 4: Specialized MCP Tools */}
                <div 
                  className="glass-card" 
                  onClick={() => setArchActiveLayer('mcp')}
                  style={{ 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    border: archActiveLayer === 'mcp' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: archActiveLayer === 'mcp' ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.01)',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: archActiveLayer === 'mcp' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>4. Specialized MCP Tools</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>9 Logistics, Booking & Custom API Helpers</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: '#f59e0b' }}>
                      FAST_MCP
                    </span>
                  </div>
                </div>

                {/* Layer Card 5: Amazon DynamoDB Persistence Layer */}
                <div 
                  className="glass-card" 
                  onClick={() => setArchActiveLayer('database')}
                  style={{ 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    border: archActiveLayer === 'database' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: archActiveLayer === 'database' ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.01)',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: archActiveLayer === 'database' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>5. Amazon DynamoDB Persistence Layer</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DynamoDB Tables & Stay State Engine</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                      DATA_STORE
                    </span>
                  </div>
                </div>

                {/* Reset Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button 
                    onClick={() => setArchActiveLayer('all')}
                    className="btn-primary"
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      fontSize: '0.78rem', 
                      justifyContent: 'center',
                      background: archActiveLayer === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                      color: archActiveLayer === 'all' ? '#000000' : 'var(--text-primary)',
                      border: archActiveLayer === 'all' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: 'none'
                    }}
                  >
                    🔍 View System Flow Summary
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic Layer Inspector Panel */}
              <div className="glass-card" style={{ padding: '24px 28px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '18px', minHeight: '440px' }}>
                
                {/* 1. All Summary view */}
                {archActiveLayer === 'all' && (
                  <>
                    <h4 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-dim)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      Platform Integration Blueprint
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                      Rain or Shine shifts AI travel coordinators out of plain conversation models into an active, contextual stay manager. It binds React portals, FastAPI, Google's ADK, and Amazon DynamoDB.
                    </p>
                    <div style={{ borderLeft: '3px solid var(--text-dim)', paddingLeft: '14px', background: 'var(--bg-card-nested)', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>How data moves during weather shifts (Automated):</div>
                      <ol style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li>OpenWeatherMap API or an IoT reef sensor transmits a live weather/swell alert (simulated in the Operator portal for testing).</li>
                        <li>FastAPI receives the weather/swell shift and automatically commits it to Amazon DynamoDB.</li>
                        <li>The backend triggers an automated background check through the Google ADK model.</li>
                        <li>Gemini uses `check_weather` and `get_bookings` to scan for outdoor conflicts.</li>
                        <li>Finding a slot conflict, Gemini queries `get_tours` for indoor options.</li>
                        <li>Gemini creates a rescheduling swap payload, rendering a card in the chat.</li>
                        <li>The guest approves the swap, triggering a live write back to Amazon DynamoDB.</li>
                      </ol>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <div style={{ flex: 1, padding: '10px', background: 'var(--slot-empty-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Core Language</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Python & JavaScript</div>
                      </div>
                      <div style={{ flex: 1, padding: '10px', background: 'var(--slot-empty-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Orchestration</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Google Cloud ADK</div>
                      </div>
                      <div style={{ flex: 1, padding: '10px', background: 'var(--slot-empty-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Partner Database</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Amazon DynamoDB</div>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Frontend View */}
                {archActiveLayer === 'frontend' && (
                  <>
                    <h4 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      Client Interface Layer (Vite Web App)
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                      A high-fidelity client app composed of separate role portals and synchronization sub-views.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', marginTop: '4px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Guest Companion Portal:</strong> Renders a live stay schedule timeline, interactive markdown receipts, and real-time chat widgets with dynamic loading/status cues.
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Operator Dashboard Console:</strong> Houses the front-desk activity layout, the weather event simulation controls, and generates physical onboarding flyers with custom check-in QR codes.
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Live Theme Engine:</strong> Handles multi-brand luxury styling. Synchronizes active themes instantly (La Coralina Gold, Nayara Cyan, and more) across all tabs by injecting custom typography and color configurations directly into root variables.
                      </div>
                    </div>
                  </>
                )}

                {/* 3. FastAPI SaaS Gateway View */}
                {archActiveLayer === 'gateway' && (
                  <>
                    <h4 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      FastAPI SaaS Routing Gateway
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                      Connects client web layers with Amazon DynamoDB data layers and our ADK reasoning loops.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#059669', fontFamily: 'monospace', width: '32px' }}>GET</span>
                        <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>/api/status</code>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Retrieves stay metadata and brand setups</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', width: '32px' }}>POST</span>
                        <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>/api/chat</code>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Injects context and runs the Gemini ADK loop</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', width: '32px' }}>POST</span>
                        <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>/api/simulate-weather</code>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Triggers weather shifts & schedules checks</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', width: '32px' }}>POST</span>
                        <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>/api/pms/sync-guest</code>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Pushes hotel PMS check-ins automatically</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', width: '32px' }}>POST</span>
                        <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>/api/tenant/extract-brand</code>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Crawls and skins custom B2B theme values</span>
                      </div>
                    </div>
                  </>
                )}

                {/* 4. Google ADK Agent Core View */}
                {archActiveLayer === 'brain' && (
                  <>
                    <h4 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <rect x="9" y="9" width="6" height="6" />
                        <line x1="9" y1="1" x2="9" y2="4" />
                        <line x1="15" y1="1" x2="15" y2="4" />
                        <line x1="9" y1="20" x2="9" y2="23" />
                        <line x1="15" y1="20" x2="15" y2="23" />
                        <line x1="20" y1="9" x2="23" y2="9" />
                        <line x1="20" y1="15" x2="23" y2="15" />
                        <line x1="1" y1="9" x2="4" y2="9" />
                        <line x1="1" y1="15" x2="4" y2="15" />
                      </svg>
                      Google Cloud Agent Development Kit (ADK) Core
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                      Rain or Shine runs natively on the Google ADK ecosystem, removing any reliance on competitive third-party orchestrators.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', marginTop: '4px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Native ADK Runner Architecture:</strong> Managed by `BocasEcoConciergeAgent` inside `agent.py`. It coordinates logical threads, reads and writes active user memory state, and interfaces directly with Gemini models.
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>In-Memory Session Isolation:</strong> Integrates custom memory stores mapped per unique guest ID, preventing data leakage across active rooms.
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Invisible Context Injections:</strong> Prefixes all user-facing inputs with critical variables (active ID, date, system clock), orienting the agent instantly without questioning the guest.
                      </div>
                    </div>
                  </>
                )}

                {/* 5. Specialized MCP Tools View */}
                {archActiveLayer === 'mcp' && (
                  <>
                    <h4 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94-7.94L11 3.96l-3.5-3.5L3.96 4 1.36 1.4a6 6 0 0 0 7.94 7.94l3.77-3.77a1 1 0 0 0 0-1.4L11.47 5.7a1 1 0 0 0-1.4 0l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0L14.7 6.3z" />
                      </svg>
                      Custom Model Context Protocol (MCP) Tools Explorer
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Select an MCP tool below to inspect its detailed parameters and business logic inside our FastMCP environment.
                    </p>
                    
                    {/* Tool Chip Selector */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0' }}>
                      {[
                        { id: 'get_tours', label: 'get_tours' },
                        { id: 'get_bookings', label: 'get_bookings' },
                        { id: 'check_weather', label: 'check_weather' },
                        { id: 'add_booking', label: 'add_booking' },
                        { id: 'reschedule_booking', label: 'reschedule_booking' },
                        { id: 'cancel_booking', label: 'cancel_booking' },
                        { id: 'update_guest_profile', label: 'update_guest' },
                        { id: 'get_current_coastal_advisory', label: 'coastal_advisory' },
                        { id: 'generate_itinerary', label: 'generate_itinerary' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedToolId(t.id)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: selectedToolId === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: selectedToolId === t.id ? '#000000' : 'var(--text-muted)',
                            border: selectedToolId === t.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Tool Detail Card */}
                    {selectedToolId && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--border-color)', padding: '14px 18px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            {selectedToolId}(...)
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, background: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '8px' }}>
                            FastMCP REGISTERED
                          </span>
                        </div>
                        
                        {selectedToolId === 'get_tours' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>guest_id: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Fetches all available resort excursions from Amazon DynamoDB, filtering out expired dates and tours that the specific guest has already completed.</div>
                          </>
                        )}
                        {selectedToolId === 'get_bookings' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>guest_id: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Fetches all current reservations booked for the designated visitor room.</div>
                          </>
                        )}
                        {selectedToolId === 'check_weather' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>date: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Pulls weather predictions for the specified date to identify pending tropical rain warnings.</div>
                          </>
                        )}
                        {selectedToolId === 'add_booking' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>guest_id: str, tour_id: str, date: str, slot: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Adds a new excursion item into DynamoDB, reducing the excursion capacity securely.</div>
                          </>
                        )}
                        {selectedToolId === 'reschedule_booking' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>booking_id: str, new_date: str, alternative_tour_id: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Modifies the target booking item. Increments previous tour capacity and locks the alternative indoor slot in a clean update transaction.</div>
                          </>
                        )}
                        {selectedToolId === 'cancel_booking' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>booking_id: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Removes the target booking document from DynamoDB, releases the reserved spot, and fires cancellation tasks to local captains and operators.</div>
                          </>
                        )}
                        {selectedToolId === 'update_guest_profile' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>guest_id: str, preferences: list, restrictions: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Records dietary habits, physical limitations, and medical alerts inside the guest profile to ensure activity operators receive correct safety data automatically.</div>
                          </>
                        )}
                        {selectedToolId === 'get_current_coastal_advisory' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> None</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Inspects live harbor briefs, swell advisories, or small-craft restrictions to ensure boat dispatch operators stay safe.</div>
                          </>
                        )}
                        {selectedToolId === 'generate_itinerary' && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Parameters:</strong> <code>guest_id: str</code></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>Business Logic:</strong> Compiles an official travel itinerary receipt formatted as clean markdown, which can be printed instantly from the Guest Portal.</div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 6. Amazon DynamoDB View */}
                {archActiveLayer === 'database' && (
                  <>
                    <h4 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                      </svg>
                      Amazon DynamoDB Persistence Layer
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                      A DynamoDB-backed persistent structure tracking resort resources, itineraries, and tenant color presets.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', marginTop: '4px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Collection: guests</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Contains profile metadata, allergies, preferences, room numbers, and hotel affiliations.</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Collection: bookings</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Reservations referencing guest IDs, excursion names, dates, times, and slots.</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Collection: tours</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Activities catalogue containing types (indoor/outdoor), prices, slots, and capacities.</div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Guest Portal View */}
      {view === 'guest' && (
        <div className={`guest-portal-wrapper show-${mobileTab}`} style={{ width: '100%' }}>
          {/* Mobile Glass Tabs */}
          <div className="guest-mobile-tabs">
            <Magnet style={{ flex: 1, display: 'flex' }} strength={12} padding={25}>
              <button 
                className={`guest-mobile-tab-btn ${mobileTab === 'chat' ? 'active' : ''}`}
                onClick={() => setMobileTab('chat')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {lang === 'es' ? 'Asistente Chat' : 'Chat Concierge'}
              </button>
            </Magnet>
            <Magnet style={{ flex: 1, display: 'flex' }} strength={12} padding={25}>
              <button 
                className={`guest-mobile-tab-btn ${mobileTab === 'itinerary' ? 'active' : ''}`}
                onClick={() => setMobileTab('itinerary')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {lang === 'es' ? 'Mi Itinerario' : 'My Itinerary'}
              </button>
            </Magnet>
          </div>

          <div className="main-grid">
            <div className="guest-col-schedule" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0, viewTransitionName: 'schedule-view' }}>
              <div className="fade-in-entry stagger-1">
                <ErrorBoundary fallback={
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: 0 }}>Weather overview is temporarily unavailable.</p>
                  </div>
                }>
                  <WeatherHorizon logistics={logistics} lang={lang} />
                </ErrorBoundary>
              </div>
              <div className="fade-in-entry stagger-2">
                <ErrorBoundary fallback={
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: 0 }}>Schedule details are temporarily unavailable.</p>
                  </div>
                }>
                  <ScheduleView bookings={bookings} tours={tours} logistics={logistics} guestId={guestId} lang={lang} />
                </ErrorBoundary>
              </div>
              <div className="fade-in-entry stagger-3">
                <ErrorBoundary fallback={
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: 0 }}>Itinerary document is temporarily unavailable.</p>
                  </div>
                }>
                  <ItineraryDoc itineraryMarkdown={itineraryMarkdown} guestId={guestId} />
                </ErrorBoundary>
              </div>
              
              {/* Urgent Human Front Desk Emergency Assistance Card */}
              <div className="glass-card fade-in-entry stagger-4" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexShrink: 0, border: '1px solid rgba(239, 68, 68, 0.15)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 650, margin: 0, color: 'var(--text-primary)' }}>
                      {lang === 'es' ? '¿Necesita Asistencia de Recepción?' : 'Need Immediate Human Assistance?'}
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 300 }}>
                      {lang === 'es' ? 'Si tiene inconvenientes con su viaje o una emergencia, llame directo a Recepción 24/7.' : 'If you are facing travel disruptions or emergencies, call our 24/7 Front Desk directly.'}
                    </p>
                  </div>
                </div>
                <a 
                  href="tel:+50766554433" 
                  style={{ 
                    padding: '10px 18px', 
                    fontSize: '0.82rem', 
                    textDecoration: 'none', 
                    background: '#ef4444', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontWeight: 600,
                    boxShadow: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  Call
                </a>
              </div>
            </div>
            <div className="guest-col-chat fade-in-entry stagger-5" style={{ viewTransitionName: 'chat-widget', position: 'sticky', top: '24px', alignSelf: 'start' }}>
              <ErrorBoundary fallback={
                <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: 0 }}>Chat Assistant is temporarily unavailable.</p>
                </div>
              }>
                <ChatWidget 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  onRespondProposal={handleRespondProposal} 
                  onSubmitFeedback={handleSendFeedback}
                  loading={loading}
                  bookings={bookings}
                  tenantBrand={tenantBrand}
                  tours={tours}
                  logistics={logistics}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Render Operator Portal View */}
      {view === 'operator' && !operatorHotelId && (
        <div className="fade-in-entry stagger-1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '24px' }}>
          <OperatorLoginForm 
            onLoginSuccess={(hotelId, hotelName) => {
              transitionState(() => {
                safeLocalStorageSet('operatorHotelId', hotelId);
                safeLocalStorageSet('operatorHotelName', hotelName);
                setOperatorHotelId(hotelId);
                setOperatorHotelName(hotelName);
              });
            }}
          />
        </div>
      )}

      {view === 'operator' && operatorHotelId && (
        <div className="main-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0, viewTransitionName: 'schedule-view' }}>
            <div className="fade-in-entry stagger-1">
              <WeatherHorizon logistics={logistics} lang={lang} />
            </div>
            <div className="fade-in-entry stagger-2">
              <ScheduleView bookings={bookings} tours={tours} logistics={logistics} guestId={guestId} lang={lang} />
            </div>
            
            {/* Onboarding Welcome Flyer Generator */}
            <div className="glass-card fade-in-entry stagger-3" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Guest Onboarding Welcome Cards
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Print a customized 5-star physical onboarding welcome flyer with a custom QR code for checking in guests.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Checked-In Guest:</span>
                <div className="custom-dropdown-container" ref={flyerDropdownRef}>
                  <button 
                    onClick={() => setFlyerDropdownOpen(!flyerDropdownOpen)}
                    className={`custom-dropdown-trigger ${flyerDropdownOpen ? 'active' : ''}`}
                    style={{
                      background: 'var(--bg-color, #ffffff)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{(guests || []).find(g => g && g._id === welcomeCardGuestId)?.name || 'Select Guest'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flyerDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--primary)' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {flyerDropdownOpen && (
                    <div className="custom-dropdown-menu" style={{ left: 0, right: 'auto', transformOrigin: 'top left', positionAnchor: '--flyer-dropdown-anchor' }}>
                      <div style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                        Checked-In Guests
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {(guests || []).map(g => g && (
                          <button
                            key={g._id}
                            onClick={() => {
                              transitionState(() => {
                                setWelcomeCardGuestId(g._id);
                                setTenantBrand(null);
                                setGuestId(g._id);
                                setMessages([]);
                                setBookings([]);
                                setItineraryMarkdown('');
                                if (g.hotel_id) {
                                  setManualHotel(g.hotel_id);
                                } else if (DEFAULT_GUEST_BRANDS[g._id]) {
                                  setManualHotel(DEFAULT_GUEST_BRANDS[g._id]);
                                }
                              });
                              setFlyerDropdownOpen(false);
                            }}
                            style={{
                              background: g._id === welcomeCardGuestId ? 'var(--primary-glow)' : 'transparent',
                              color: g._id === welcomeCardGuestId ? 'var(--primary)' : 'var(--text-primary)',
                              border: 'none',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (g._id !== welcomeCardGuestId) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.color = 'var(--primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (g._id !== welcomeCardGuestId) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }
                            }}
                          >
                            <span style={{ fontWeight: g._id === welcomeCardGuestId ? 600 : 400 }}>{g.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{g.hotel_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SaaS B2B Security Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>B2B Security Mode</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {isSecureMode ? 'HMAC-Signed Passwordless Token' : 'Hackathon Demo (Open Access)'}
                  </span>
                </div>
                <button
                  onClick={() => setIsSecureMode(!isSecureMode)}
                  style={{
                    background: isSecureMode ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: isSecureMode ? 'hsl(210, 32%, 5%)' : 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'var(--transition)',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isSecureMode ? 'hsl(210, 32%, 5%)' : 'var(--text-dim)',
                    display: 'inline-block'
                  }}></span>
                  {isSecureMode ? 'SECURE ACTIVE' : 'DEMO OPEN'}
                </button>
              </div>

              {/* Flyer Preview Card */}
              {(() => {
                const selectedGuest = (guests || []).find(g => g && g._id === welcomeCardGuestId) || (guests || [])[0];
                if (!selectedGuest) return null;
                const guestDirectLink = isSecureMode && operatorFlyerToken 
                  ? `${window.location.origin}?token=${operatorFlyerToken}` 
                  : `${window.location.origin}?guest_id=${selectedGuest._id}`;

                const flyerBrandId = selectedGuest.hotel_id;
                const flyerBrand = tenantBrandsMock[flyerBrandId] || tenantsList.find(t => t._id === flyerBrandId) || tenantBrand;

                // Calculate inline overrides for CSS variables:
                const flyerStyleOverrides = flyerBrand ? {
                  '--primary': flyerBrand.primary_color,
                  '--primary-glow': flyerBrand.primary_glow,
                  ...(() => {
                    if (flyerBrand.primary_color && flyerBrand.primary_color.includes('hsl')) {
                      const colorValue = flyerBrand.primary_color.replace('hsl(', '').replace(')', '');
                      const hslParts = colorValue.split(',').map(p => p.trim());
                      let btnText = '#ffffff';
                      if (hslParts.length === 3) {
                        const lVal = parseInt(hslParts[2], 10);
                        btnText = lVal < 52 ? '#ffffff' : '#0f172a';
                      }
                      return {
                        '--border-color': `hsla(${colorValue}, 0.16)`,
                        '--border-glow': `hsla(${colorValue}, 0.35)`,
                        '--primary-btn-text': btnText,
                      };
                    }
                    return {
                      '--primary-btn-text': '#ffffff',
                    };
                  })()
                } : {};

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', ...flyerStyleOverrides }}>
                    {/* The Printable Container */}
                    <div className="print-welcome-card-area glass-card" style={{
                      padding: '24px',
                      background: 'var(--panel-bg, #0c0c0f)',
                      border: '1px dashed var(--primary)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        {selectedGuest.hotel_name}
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>
                        Welcome to Paradise, {selectedGuest.name}!
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.4' }}>
                        Your personalized digital eco-concierge is ready. Scan the QR code below using your mobile phone camera to instantly chat with your island companion and customize your itinerary.
                      </p>
                      
                      {/* QR Code Container */}
                      <div style={{
                        background: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'inline-block',
                        margin: '6px 0',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0f172b&data=${encodeURIComponent(guestDirectLink)}`} 
                          alt="Onboarding QR Code" 
                          style={{ width: '120px', height: '120px', display: 'block' }}
                        />
                      </div>

                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Customized stay: {selectedGuest.stay_start} to {selectedGuest.stay_end}
                      </span>
                    </div>

                    <Magnet style={{ width: '100%', display: 'block' }} strength={12} padding={25}>
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          window.print();
                        }}
                        style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', width: '100%' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Print Welcome Card for {selectedGuest.name}
                      </button>
                    </Magnet>
                  </div>
                );
              })()}
            </div>

            {/* Boat Captain PWA Onboarding Cards */}
            <div className="glass-card fade-in-entry stagger-4" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Captain PWA Onboarding & Setup Cards
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Select a marine boat captain to generate a bilingual setup flyer with a personalized QR code for instant PWA installation (no App Store download required).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Captain:</span>
                <select
                  value={onboardingCaptainId}
                  onChange={(e) => setOnboardingCaptainId(e.target.value)}
                  style={{
                    background: 'var(--bg-color, #ffffff)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    colorScheme: 'light',
                    cursor: 'pointer'
                  }}
                >
                  {(captains || []).map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.boat || 'Water Taxi'})</option>
                  ))}
                  {captains.length === 0 && (
                    <>
                      <option value="cap1">Captain Luis (La Estrella)</option>
                      <option value="cap2">Captain Marco (Isla Bonita)</option>
                      <option value="cap3">Captain Rosa (Coral Queen)</option>
                    </>
                  )}
                </select>
              </div>

              {(() => {
                const activeCapId = onboardingCaptainId || (captains[0]?._id) || 'cap1';
                const selectedCaptain = (captains || []).find(c => c && c._id === activeCapId) || { _id: activeCapId, name: activeCapId === 'cap1' ? 'Captain Luis' : activeCapId === 'cap2' ? 'Captain Marco' : 'Captain Rosa', boat: activeCapId === 'cap1' ? 'La Estrella' : activeCapId === 'cap2' ? 'Isla Bonita' : 'Coral Queen' };
                if (!selectedCaptain) return null;

                const captainDirectLink = `${window.location.origin}?view=captain&captain_id=${selectedCaptain._id}`;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* The Printable Captain Card */}
                    <div className="print-welcome-card-area glass-card" style={{
                      padding: '24px',
                      background: 'var(--panel-bg, #0c0c0f)',
                      border: '1px dashed var(--primary)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#0ea5e9', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        Bocas del Toro Marine Fleet Setup
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>
                        {selectedCaptain.name} &bull; {selectedCaptain.boat}
                      </h3>
                      
                      {/* Grid for Bilingual Steps */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '20px', 
                        textAlign: 'left', 
                        width: '100%', 
                        maxWidth: '650px',
                        marginTop: '10px',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '16px'
                      }}>
                        {/* English Instructions */}
                        <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            English Installation
                          </h4>
                          <ol style={{ fontSize: '0.78rem', color: '#94a3b8', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>Scan the QR code below using your mobile phone camera.</li>
                            <li>Tap your browser's <strong>Share / Options</strong> button.</li>
                            <li>Tap <strong>"Add to Home Screen"</strong> to download the PWA instantly.</li>
                            <li>Open from your home screen to receive live boat dispatches in Spanish or English.</li>
                          </ol>
                        </div>

                        {/* Spanish Instructions */}
                        <div style={{ paddingLeft: '10px' }}>
                          <h4 style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Instalación en Español
                          </h4>
                          <ol style={{ fontSize: '0.78rem', color: '#94a3b8', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>Escanee el código QR con la cámara de su teléfono móvil.</li>
                            <li>Toque el botón de <strong>Compartir / Opciones</strong> de su navegador.</li>
                            <li>Toque <strong>"Añadir a pantalla de inicio"</strong> para descargar la PWA al instante.</li>
                            <li>Abra la app desde su pantalla de inicio para recibir despachos en vivo en español.</li>
                          </ol>
                        </div>
                      </div>

                      {/* QR Code Container */}
                      <div style={{
                        background: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'inline-block',
                        margin: '12px 0 6px 0',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0f172b&data=${encodeURIComponent(captainDirectLink)}`} 
                          alt="Captain Onboarding QR Code" 
                          style={{ width: '120px', height: '120px', display: 'block' }}
                        />
                      </div>

                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Secure PWA target: {selectedCaptain.name} ({selectedCaptain.boat})
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <Magnet style={{ width: '100%', display: 'block' }} strength={12} padding={25}>
                        <button 
                          className="btn-primary" 
                          onClick={() => {
                            window.print();
                          }}
                          style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-btn-text, #000000)', border: 'none', width: '100%', borderRadius: '8px', fontWeight: 650 }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                          </svg>
                          Print Setup Card for {selectedCaptain.name}
                        </button>
                      </Magnet>

                      {/* Dynamic Digital Onboarding Dispatch Tools (No Paper Needed!) */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        width: '100%',
                        boxSizing: 'border-box',
                        textAlign: 'left'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {lang === 'es' ? 'Despacho Digital Instantáneo' : 'Instant Digital Dispatch Tools'}
                          </h4>
                        </div>
                        
                        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {lang === 'es' 
                            ? 'Envíe el enlace del portal directamente al teléfono del capitán. No necesitan escanear nada; el enlace se abre en su navegador para instalar la PWA.' 
                            : "Send the portal link directly to the captain's phone. They do not need to scan anything; the link opens instantly in their browser to install the PWA."}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                          {/* Copy Link Button */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(captainDirectLink);
                              setPushToastText(lang === 'es' ? "✓ ¡Enlace del capitán copiado al portapapeles!" : "✓ Captain's portal link copied to clipboard!");
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              color: '#f8fafc',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              flex: '1 1 140px',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {lang === 'es' ? 'Copiar Enlace' : 'Copy Direct Link'}
                          </button>

                          {/* WhatsApp Dispatch Button */}
                          <button
                            onClick={() => {
                              const cleanPhone = (selectedCaptain.phone || '').replace(/[^0-9+]/g, '');
                              const text = lang === 'es'
                                ? `¡Hola ${selectedCaptain.name}! Aquí tiene su enlace personal para el Portal de Mando de Rain or Shine. Toque para abrirlo e instalarlo como aplicación en su pantalla de inicio: ${captainDirectLink}`
                                : `Hello ${selectedCaptain.name}! Here is your personal Rain or Shine Captain Portal link. Tap to open and install as an app on your phone: ${captainDirectLink}`;
                              const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(text)}`;
                              window.open(waUrl, '_blank');
                              setPushToastText(lang === 'es' ? `[DESPACHO] Abriendo WhatsApp para ${selectedCaptain.name}...` : `[DISPATCH] Opening WhatsApp for ${selectedCaptain.name}...`);
                            }}
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              color: '#4ade80',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              flex: '1 1 140px',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            {lang === 'es' ? 'Enviar por WhatsApp' : 'Dispatch via WhatsApp'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Active Itinerary Bookings & Boat Captains Assignment */}
            <div className="glass-card fade-in-entry stagger-5" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  Boat Captain Assignments
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Assign certified water-taxi or tour boat captains to {(guests || []).find(g => g && g._id === welcomeCardGuestId)?.name || 'the guest'}'s booked excursions.
                </p>
              </div>

              {bookings.filter(b => b.guest_id && welcomeCardGuestId && String(b.guest_id) === String(welcomeCardGuestId)).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No active bookings for this guest itinerary.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bookings
                    .filter(b => b.guest_id && welcomeCardGuestId && String(b.guest_id) === String(welcomeCardGuestId))
                    .map(b => {
                      const tour = tours.find(t => t._id === b.tour_id);
                      return (
                        <div 
                          key={b._id} 
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px', 
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {tour?.name || 'Eco Excursion'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {b.date} &bull; <span style={{ textTransform: 'capitalize' }}>{b.slot}</span>
                            </div>
                            {b.captain_status && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                <span style={{ 
                                  fontSize: '0.68rem', 
                                  padding: '2px 6px', 
                                  borderRadius: '6px',
                                  background: b.captain_status === 'confirmed' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(14, 165, 233, 0.12)',
                                  color: b.captain_status === 'confirmed' ? '#059669' : '#0ea5e9',
                                  border: `1px solid ${b.captain_status === 'confirmed' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(14, 165, 233, 0.2)'}`,
                                  fontWeight: 600,
                                  textTransform: 'capitalize'
                                }}>
                                  📡 {b.captain_status.replace('-', ' ')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={b.captain_id || ''}
                              onChange={(e) => handleAssignCaptain(b._id, e.target.value)}
                              style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#f8fafc',
                                fontSize: '13px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">-- Unassigned --</option>
                              {captains.map(c => (
                                <option key={c._id} value={c._id}>{c.name} ({c.boat})</option>
                              ))}
                              {captains.length === 0 && (
                                <>
                                  <option value="cap1">Captain Luis (La Estrella)</option>
                                  <option value="cap2">Captain Marco (Isla Bonita)</option>
                                  <option value="cap3">Captain Rosa (Coral Queen)</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', viewTransitionName: 'control-panel' }}>
            <div className="fade-in-entry stagger-6">
              <ControlPanel 
                logistics={logistics} 
                onSimulate={handleSimulate} 
                onReset={handleReset} 
                agentLogs={agentLogs} 
                loading={loading}
              />
            </div>

            {/* SaaS B2B Product Analytics & AWS Telemetry KPI Dashboard */}
            <div className="glass-card fade-in-entry stagger-7" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    B2B SaaS Product Analytics
                  </h3>
                  <span style={{ 
                    background: 'rgba(5, 150, 105, 0.08)', 
                    color: '#059669', 
                    border: '1px solid rgba(5, 150, 105, 0.25)', 
                    padding: '3px 10px', 
                    borderRadius: '20px', 
                    fontSize: '0.65rem', 
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    letterSpacing: '0.04em'
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                    SYSTEM ACTIVE
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Real-time guest value metrics, feature adoption parameters, and live system telemetry events for the white-label luxury resort accounts.
                </p>
              </div>

              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>94.2%</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>AI Concierge Engagement</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>88.5%</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Replan Proposal Swap Rate</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>1.2s</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Avg Dispatch Latency</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>+84</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Net Friction Reduction NPS</div>
                </div>
              </div>

              {/* Live SDK Telemetry Logger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Live System Telemetry Stream
                </span>
                <div style={{ 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  fontSize: '0.72rem', 
                  fontFamily: 'monospace', 
                  maxHeight: '130px', 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ color: '#a7f3d0' }}>
                    <span style={{ color: 'var(--text-dim)' }}>[Telemetry]</span> Database connection established (AWS DynamoDB)
                  </div>
                  {itineraryMarkdown && (
                    <div style={{ color: '#e0f2fe' }}>
                      <span style={{ color: 'var(--text-dim)' }}>[Telemetry]</span> Itinerary document loaded for guest "{guestId}"
                    </div>
                  )}
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.68rem', marginTop: '4px' }}>
                    * Listening for new API transactions and operations...
                  </div>
                </div>
              </div>

              {/* B2B Framework Info */}
              <div style={{ 
                background: 'var(--primary-glow)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '10px', 
                padding: '12px', 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)', 
                lineHeight: '1.4'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '2px' }}>AWS DynamoDB Data Strategy:</div>
                Each resort tenant represents a partitioned key-space. Guests and hotel staff represent unique user session contexts. This enables deep SaaS product analyses, mapping workflow efficiency directly to guest satisfaction and hotel operational retention KPIs.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Business Integrations View */}
      {view === 'integrations' && (
        <ErrorBoundary onReset={() => navigateToView('landing')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Hero Section */}
          <div className="landing-hero" style={{ padding: '30px', marginBottom: '0px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <h2 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Enterprise Workflow & Front Desk Portal
             </h2>
            <p className="landing-intro" style={{ fontSize: '0.95rem', margin: 0 }}>
              Onboard guests, generate digital itineraries, and print welcome cards. Support both local manual operations and zero-code automated PMS integrations (like Cloudbeds, MEWS, or custom engines).
            </p>
          </div>

          {/* Premium Sub-Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', paddingBottom: '4px' }}>
            <button 
              onClick={() => setIntegrationTab('manual')}
              style={{
                background: integrationTab === 'manual' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'manual' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'manual' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              Simple Check-In Portal (No PMS)
            </button>
            <button 
              onClick={() => setIntegrationTab('webhook')}
              style={{
                background: integrationTab === 'webhook' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'webhook' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'webhook' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Real-time Webhooks & API
            </button>
            <button 
              onClick={() => setIntegrationTab('custom_tours')}
              style={{
                background: integrationTab === 'custom_tours' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'custom_tours' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'custom_tours' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Register Custom Tours
            </button>
            <button 
              onClick={() => setIntegrationTab('messaging')}
              style={{
                background: integrationTab === 'messaging' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'messaging' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'messaging' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Pre-Arrival Messaging (Email & WhatsApp)
            </button>
          </div>

          {/* Sub-Tab 1: Manual Front Desk Check-In Portal */}
          {integrationTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Frictionless White-Label Guest Workflow Explainer */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--primary)' }}>
                      Frictionless White-Label Guest Workflow
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      How Rain or Shine delivers a premium 5-star experience with zero login friction on the hotel ground.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '4px' }}>
                  
                  {/* Step 1 */}
                  <div style={{ background: 'var(--slot-bg, rgba(255, 255, 255, 0.5))', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', transition: 'all 0.2s ease' }}>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--border-color)', opacity: 0.35, fontFamily: 'var(--font-serif)' }}>01</div>
                    <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 650, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>1. Front Desk Registration</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                        The receptionist registers the arriving guest (using the Manual Check-In Form below, or automatically when your PMS pushes a check-in webhook).
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ background: 'var(--slot-bg, rgba(255, 255, 255, 0.5))', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', transition: 'all 0.2s ease' }}>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--border-color)', opacity: 0.35, fontFamily: 'var(--font-serif)' }}>02</div>
                    <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 650, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>2. Hand Welcome Card</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                        Hand the guest a premium physical welcome card or keycard sleeve printed with their unique, secure, pre-authenticated magic QR code.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ background: 'var(--slot-bg, rgba(255, 255, 255, 0.5))', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', transition: 'all 0.2s ease' }}>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--border-color)', opacity: 0.35, fontFamily: 'var(--font-serif)' }}>03</div>
                    <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 650, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>3. Frictionless QR Scan</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                        The guest scans the card's QR code with their mobile phone camera. No logins, passwords, or app installations are needed.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div style={{ background: 'var(--slot-bg, rgba(255, 255, 255, 0.5))', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', transition: 'all 0.2s ease' }}>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--border-color)', opacity: 0.35, fontFamily: 'var(--font-serif)' }}>04</div>
                    <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 650, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>4. Instant Activation</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                        The personalized guest portal loads instantly—automatically styled with the hotel's custom branding, local weather, and itinerary details!
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Interactive Manual Form Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Manual Guest Check-In Form
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    For local overwater lodges, boutique stays, and tour operators with manual reservation books. Register check-ins live into your Amazon DynamoDB cluster.
                  </p>
                </div>

                <form onSubmit={handleManualCheckInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Two Column Grid: Name and Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Guest Full Name *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Michael Jordan"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        style={{
                          background: 'var(--bg-color, #ffffff)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%',
                          transition: 'all 0.25s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)';
                          e.target.style.background = 'var(--bg-color, #ffffff)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Phone Number *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. +1-555-0199"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        style={{
                          background: 'var(--bg-color, #ffffff)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%',
                          transition: 'all 0.25s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)';
                          e.target.style.background = 'var(--bg-color, #ffffff)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Resort Option Cards Grid */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
                      Resort Property (Tenant Brand)
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '12px',
                      marginTop: '4px'
                    }}>
                      {[
                        ...Object.entries(tenantBrandsMock || {}).map(([id, b]) => ({ _id: id, ...b })),
                        ...(tenantsList || []).filter(t => t && t._id && !tenantBrandsMock[t._id])
                      ].map(hotel => {
                        if (!hotel) return null;
                        const isSelected = manualHotel === hotel._id;
                        const accentColor = hotel.primary_color;
                        const previewGlow = hotel.primary_glow || 'rgba(255,255,255,0.05)';
                        
                        return (
                          <div
                            key={hotel._id}
                            onClick={() => setManualHotel(hotel._id)}
                            style={{
                              background: isSelected ? 'var(--slot-bg, rgba(255, 255, 255, 0.65))' : 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))',
                              border: '2px solid',
                              borderColor: isSelected ? accentColor : 'var(--border-color)',
                              borderRadius: '12px',
                              padding: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              position: 'relative',
                              boxShadow: isSelected ? `0 4px 14px ${previewGlow}` : 'none',
                              transform: isSelected ? 'scale(1.02)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'var(--slot-empty-bg, rgba(255, 255, 255, 0.35))',
                                border: '1.5px solid',
                                borderColor: isSelected ? accentColor : 'var(--border-color)',
                                boxShadow: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                transition: 'all 0.25s'
                              }}>
                                {hotel.logo_url && !logoErrors[hotel._id] ? (
                                  <img 
                                    src={hotel.logo_url} 
                                    alt={hotel.name} 
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover' 
                                    }} 
                                    onError={() => {
                                      setLogoErrors(prev => ({ ...prev, [hotel._id]: true }));
                                    }}
                                  />
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M12 22c1-4 1-8 0-12" />
                                    <path d="M5 22c2-.5 12-.5 14 0" />
                                    <path d="M12 10c-3-2-7-1-9 2" />
                                    <path d="M12 10c3-2 7-1 9 2" />
                                    <path d="M12 10c-4 .5-8 3-9 7" />
                                    <path d="M12 10c4 .5 8 3 9 7" />
                                    <path d="M12 10c-1.5-4-5-6-8-6" />
                                    <path d="M12 10c1.5-4 5-6 8-6" />
                                  </svg>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Delete Button (Only for custom onboarded hotels) */}
                                {!tenantBrandsMock[hotel._id] && (
                                  <button
                                    onClick={(e) => handleDeleteHotel(hotel._id, e)}
                                    title="Delete custom hotel"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-dim)',
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.85rem',
                                      fontWeight: 'bold',
                                      transition: 'all 0.2s',
                                      zIndex: 10
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
                                  >
                                    ✕
                                  </button>
                                )}
                                
                                {/* Selection Indicator Check */}
                                {isSelected && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 650, color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {hotel.name}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {hotel.font ? hotel.font.split(',')[0] : 'Inter'}
                              </span>
                            </div>


                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Two Column Grid: Arrival & Departure */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Check-In Date
                      </label>
                      <input 
                        type="date" 
                        value={manualStayStart}
                        onChange={(e) => setManualStayStart(e.target.value)}
                        style={{
                          background: 'var(--bg-color, #ffffff)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%',
                          colorScheme: 'light',
                          transition: 'all 0.25s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)';
                          e.target.style.background = 'var(--bg-color, #ffffff)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Check-Out Date
                      </label>
                      <input 
                        type="date" 
                        value={manualStayEnd}
                        onChange={(e) => setManualStayEnd(e.target.value)}
                        style={{
                          background: 'var(--bg-color, #ffffff)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%',
                          colorScheme: 'light',
                          transition: 'all 0.25s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)';
                          e.target.style.background = 'var(--bg-color, #ffffff)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Preferences / Tags */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Guest Vibe / Travel Styles
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {['adventure', 'relaxation', 'wellness', 'wildlife', 'culture', 'indoor'].map(tag => {
                        const isSelected = manualPreferences.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setManualPreferences(prev => prev.filter(t => t !== tag));
                              } else {
                                setManualPreferences(prev => [...prev, tag]);
                              }
                            }}
                            style={{
                              background: isSelected ? 'var(--primary)' : 'var(--bg-color, #ffffff)',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                              color: isSelected ? 'var(--primary-btn-text, #ffffff)' : 'var(--text-primary)',
                              padding: '6px 12px',
                              borderRadius: '16px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              textTransform: 'capitalize'
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes & Special Requests */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Front-Desk Notes / Special Requests (Optional)
                    </label>
                    <textarea 
                      placeholder="e.g. Honeymoon couple. Enjoys early mornings. Prefers overwater massage decks."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      rows={2}
                      style={{
                        background: 'var(--bg-color, #ffffff)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        fontSize: '0.88rem',
                        outline: 'none',
                        width: '100%',
                        resize: 'none',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.25s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary)';
                        e.target.style.background = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-color)';
                        e.target.style.background = 'var(--bg-color, #ffffff)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Pre-Booked Activities */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', margin: 0 }}>
                      Pre-Booked Excursions & Spa (Check to include in itinerary)
                    </label>
                    <div style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {tours.map(tour => {
                        const isChecked = manualBookings.some(b => b.tour_id === tour._id);
                        const bookingDetail = manualBookings.find(b => b.tour_id === tour._id);
                        return (
                          <div key={tour._id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                type="checkbox"
                                id={`chk-${tour._id}`}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Calculate the next available timeslot based on existing selections
                                    const slotOrder = { morning: 0, afternoon: 1, evening: 2 };
                                    const getSlotOrder = (s) => (slotOrder[s?.toLowerCase()] !== undefined ? slotOrder[s?.toLowerCase()] : 99);
                                    
                                    let nextDate = manualStayStart;
                                    let nextSlot = tour.slots?.[0] || 'morning';
 
                                    if (manualBookings.length > 0) {
                                      // Sort existing bookings chronologically
                                      const sortedBookings = [...manualBookings].sort((a, b) => {
                                        if (a.date !== b.date) {
                                          return a.date.localeCompare(b.date);
                                        }
                                        return getSlotOrder(a.slot) - getSlotOrder(b.slot);
                                      });
                                      
                                      const latest = sortedBookings[sortedBookings.length - 1];
                                      const latestDateStr = latest.date;
                                      const latestSlot = latest.slot;
                                      const latestSlotOrder = getSlotOrder(latestSlot);
                                      
                                      // Check if this tour has any slots on the same day that are chronologically after the latest booked slot
                                      const tourSlots = tour.slots || ['morning', 'afternoon'];
                                      const laterSlots = tourSlots.filter(s => getSlotOrder(s) > latestSlotOrder);
                                      
                                      if (laterSlots.length > 0) {
                                        // Use the same date, but the first chronological later slot
                                        nextDate = latestDateStr;
                                        laterSlots.sort((a, b) => getSlotOrder(a) - getSlotOrder(b));
                                        nextSlot = laterSlots[0];
                                      } else {
                                        // Move to the next day
                                        const currentDate = new Date(latestDateStr + 'T12:00:00'); // set noon to avoid timezone anomalies
                                        currentDate.setDate(currentDate.getDate() + 1);
                                        const nextDayStr = currentDate.toISOString().split('T')[0];
                                        
                                        if (manualStayEnd && nextDayStr <= manualStayEnd) {
                                          nextDate = nextDayStr;
                                        } else {
                                          nextDate = manualStayEnd || latestDateStr;
                                        }
                                        
                                        // Sort tour slots chronologically and take the first one
                                        const sortedTourSlots = [...tourSlots].sort((a, b) => getSlotOrder(a) - getSlotOrder(b));
                                        nextSlot = sortedTourSlots[0] || 'morning';
                                      }
                                    }
 
                                    setManualBookings(prev => [...prev, {
                                      tour_id: tour._id,
                                      date: nextDate,
                                      slot: nextSlot,
                                      price: tour.price || 0.0
                                    }]);
                                  } else {
                                    setManualBookings(prev => prev.filter(b => b.tour_id !== tour._id));
                                  }
                                }}
                                style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '15px', height: '15px' }}
                              />
                              <label htmlFor={`chk-${tour._id}`} style={{ fontSize: '0.82rem', fontWeight: 550, cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{tour.name}</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>${tour.price}</span>
                              </label>
                            </div>
 
                            {isChecked && bookingDetail && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginLeft: '22px', background: 'var(--slot-bg, rgba(255,255,255,0.5))', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '6px' }}>
                                <div>
                                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Excursion Date</label>
                                  <input 
                                    type="date"
                                    min={manualStayStart}
                                    max={manualStayEnd}
                                    value={bookingDetail.date}
                                    onChange={(e) => {
                                      const dVal = e.target.value;
                                      setManualBookings(prev => prev.map(b => b.tour_id === tour._id ? { ...b, date: dVal } : b));
                                    }}
                                    style={{
                                      background: 'var(--bg-color, hsla(38, 30%, 98%, 1))',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '4px 6px',
                                      fontSize: '0.74rem',
                                      colorScheme: 'light',
                                      width: '100%'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Time Slot</label>
                                  <select
                                    value={bookingDetail.slot}
                                    onChange={(e) => {
                                      const sVal = e.target.value;
                                      setManualBookings(prev => prev.map(b => b.tour_id === tour._id ? { ...b, slot: sVal } : b));
                                    }}
                                    style={{
                                      background: 'var(--bg-color, hsla(38, 30%, 98%, 1))',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '4px 6px',
                                      fontSize: '0.74rem',
                                      width: '100%',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {(tour.slots || ['morning', 'afternoon']).map(s => (
                                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ padding: '12px', width: '100%', marginTop: '8px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Check In Guest & Generate Digital Portal
                  </button>

                </form>
              </div>

              {/* Dynamic Onboarding Card or Live Welcome Card Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {successGuest ? (
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--primary)', background: 'var(--panel-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        background: 'var(--primary-glow)', 
                        color: 'var(--primary)', 
                        border: '1px solid var(--primary)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em'
                      }}>
                        GUEST ONBOARDED LIVE
                      </span>
                      <button 
                        onClick={() => setSuccessGuest(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        Reset Form
                      </button>
                    </div>

                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Onboarding Successful!
                    </h4>

                    {/* Simulated Success Card Block */}
                    <div style={{
                      background: 'var(--bg-color)',
                      border: '1.5px solid var(--primary)',
                      borderRadius: '12px',
                      padding: '24px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '14px',
                      position: 'relative',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '12px', right: '12px',
                        background: 'var(--primary-glow)',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)',
                        padding: '4px 10px',
                        borderRadius: '10px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em'
                      }}>
                        SECURE MAGIC-LINK
                      </div>

                      <h5 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 0 0', fontFamily: 'var(--font-serif)', color: 'var(--primary)' }}>
                        {successGuest.name}
                      </h5>
                      
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '280px', margin: 0, lineHeight: '1.4' }}>
                        Scan to unlock your secure, personalized weather-intelligent eco-concierge for <strong>{successGuest.hotel_name}</strong>.
                      </p>

                      <div style={{
                        background: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'inline-block'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=0f172b&data=${encodeURIComponent(
                            successGuest.secure_token 
                              ? `${window.location.origin}/?token=${successGuest.secure_token}`
                              : `${window.location.origin}/?guest_id=${successGuest.guest_id}&secure=true`
                          )}`} 
                          alt="Onboarding QR Code" 
                          style={{ width: '110px', height: '110px', display: 'block' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 650 }}>
                          Guest ID: {successGuest.guest_id}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          Stay schedule: {successGuest.stay_start} to {successGuest.stay_end}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                      <Magnet style={{ width: '100%', display: 'block' }} strength={15} padding={35}>
                        <button 
                          onClick={() => {
                            const url = successGuest.secure_token 
                              ? `${window.location.origin}/?token=${successGuest.secure_token}`
                              : `${window.location.origin}/?guest_id=${successGuest.guest_id}&secure=true`;
                            window.open(url, '_blank');
                          }}
                          style={{
                            background: 'var(--primary)',
                            color: '#000',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                            width: '100%',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          <span>Launch Isolated Guest Portal (New Tab)</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </Magnet>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setToken(successGuest.secure_token);
                            setIsSecureModeActive(true);
                            setIsGuestViewOnly(true);
                            setTenantBrand(null);
                            setGuestId(successGuest.guest_id);
                            setView('guest');
                            setMessages([]);
                            setBookings([]);
                            setItineraryMarkdown('');
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        >
                          Simulate in Current Tab
                        </button>
                        <button
                          onClick={() => setSuccessGuest(null)}
                          style={{
                            background: 'var(--primary-glow)',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--primary-glow)';
                            e.currentTarget.style.color = 'var(--primary)';
                          }}
                        >
                          Check In Another Guest
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'rgba(5, 150, 105, 0.01)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'start', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', color: '#059669' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span><strong>Production Mode:</strong> The guest's welcome card is active. Opening the portal in a new tab will load with zero context-switching capability, behaving exactly like the production ecosystem.</span>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--primary)', background: 'hsla(38, 45%, 60%, 0.02)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Live Welcome Card Preview
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      This is a live mockup of the physical welcome flyer automatically generated upon check-in. Put this in your guest's welcome envelope or print it directly!
                    </p>

                    {/* Simulated Card Block */}
                    <div style={{
                      background: 'var(--bg-color)',
                      border: '1px dashed var(--primary)',
                      borderRadius: '12px',
                      padding: '24px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '14px',
                      position: 'relative'
                    }}>
                      {/* Tiny Ribbon */}
                      <div style={{
                        position: 'absolute',
                        top: '12px', right: '12px',
                        background: 'var(--primary-glow)',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)',
                        padding: '4px 10px',
                        borderRadius: '10px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em'
                      }}>
                        ECO-CONCIERGE
                      </div>

                      <h5 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 0 0', fontFamily: 'var(--font-serif)', color: 'var(--primary)' }}>
                        {manualName ? manualName : "Guest Full Name"}
                      </h5>
                      
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '280px', margin: 0, lineHeight: '1.4' }}>
                        Welcome to <strong>{([ ...Object.entries(tenantBrandsMock || {}).map(([id, b]) => ({ _id: id, ...b })), ...(tenantsList || []) ]).find(h => h && h._id === manualHotel)?.name || 'La Coralina Island House'}</strong>. Scan this QR code to unlock your personalized, weather-intelligent eco-concierge.
                      </p>

                      <div style={{
                        background: 'white',
                        padding: '8px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'inline-block'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=0f172b&data=${encodeURIComponent(window.location.origin + "?guest_id=" + (manualName ? "g_manual_preview" : "g_placeholder"))}`} 
                          alt="Onboarding QR Code" 
                          style={{ width: '100px', height: '100px', display: 'block', opacity: manualName ? 1 : 0.4 }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 650 }}>
                          Scan to Access Your Itinerary
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          Custom stay: {manualStayStart} to {manualStayEnd}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'start', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span><strong>Upon submission:</strong> This guest will be recorded in Amazon DynamoDB, a secure magic-link QR will generate, and you can instantly launch their 100% isolated private companion portal or simulate them here.</span>
                    </div>
                  </div>
                )}

                {/* AI Brand Extractor Panel */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--primary)', background: 'hsla(38, 45%, 60%, 0.02)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    </svg>
                    AI Brand Extractor
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Onboard any custom hotel or resort instantly. Type their website URL below, and Gemini 3.1 Flash-Lite will extract their brand name, premium color palettes, custom typography, and elite greetings.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. fourseasons.com"
                        value={extractionUrl}
                        onChange={(e) => setExtractionUrl(e.target.value)}
                        style={{
                          background: 'var(--bg-color, #ffffff)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%',
                          transition: 'all 0.25s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 2px var(--primary-glow)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)';
                          e.target.style.background = 'var(--bg-color, #ffffff)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    
                    <button
                      type="button"
                      disabled={loadingBrand || !extractionUrl.trim()}
                      onClick={handleExtractBrand}
                      className="btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      {loadingBrand ? (
                        <>
                          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Extracting Brand Identity...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                          Extract Brand with Gemini
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

          {/* Sub-Tab 2: Technical Webhooks Integration Panel */}
          {integrationTab === 'webhook' && (
            <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Plain English Visual Guide for Non-Tech Savvy Operators */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    How Webhooks Work (Zero-Code Guide)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    You don't need a software developer or coding experience to connect your existing hotel systems! Webhooks act as background notifications that sync reservations automatically.
                  </p>
                </div>

                {/* Conceptual Process Flow Infographic */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: 'var(--slot-empty-bg)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 650, display: 'block', color: 'var(--text-primary)' }}>Staff Checks-In Guest</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>You check in Michael Jordan at your front desk in your PMS software (e.g. Cloudbeds).</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: 'var(--slot-empty-bg)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 650, display: 'block', color: 'var(--text-primary)' }}>PMS Sends Background Message</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Your software immediately emails details to our secure webhook URL behind the scenes.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: 'var(--slot-empty-bg)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 650, display: 'block', color: 'var(--text-primary)' }}>Itinerary Activated Instantly</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Amazon DynamoDB tables are seeded, the AI compiles a weather-aware flyer, and prints their welcome QR code!</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Configuration Steps for Cloudbeds or MEWS:</h4>
                  <ol style={{ fontSize: '0.82rem', color: 'var(--text-dim)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, lineHeight: '1.5' }}>
                    <li>Log in to your <strong>Cloudbeds / MEWS Dashboard</strong>.</li>
                    <li>Go to <strong>Settings ➔ Manage Integrations</strong> (or look for Webhooks).</li>
                    <li>Click <strong>"Add Webhook"</strong> or <strong>"Register Endpoint"</strong>.</li>
                    <li>Choose the event trigger: <strong>"Guest Checked In"</strong> (or "Reservation Created").</li>
                    <li>Copy and Paste this exact URL into the input field:
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', marginBottom: '4px' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value={`${API_BASE}/api/pms/sync-guest`} 
                          style={{ fontSize: '0.75rem', fontFamily: 'monospace', padding: '6px 10px', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '4px', flex: 1, color: '#38bdf8' }}
                          onClick={(e) => {
                            e.currentTarget.select();
                            document.execCommand('copy');
                            alert("Copied to clipboard!");
                          }}
                        />
                        <button 
                          type="button" 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                          onClick={() => {
                            navigator.clipboard.writeText(`${API_BASE}/api/pms/sync-guest`);
                            alert("Copied to clipboard!");
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                    <li>Click <strong>Save</strong>. You are completely done! Everything is fully automated.</li>
                  </ol>
                </div>
              </div>

              {/* Developer Documentation & Automated Mock Synergizer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Tech Endpoint Specs */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
                    JSON API Endpoint Definition
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    For developers building bespoke pipelines. Delivers standard Pydantic payload models.
                  </p>
                  
                  <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                    <span style={{ color: '#38bdf8', fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>POST /api/pms/sync-guest</span>
                    <pre style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: 0, fontFamily: 'Courier New, monospace' }}>
{`{
  "guest_id": "g_pms_42",
  "name": "Bruce Wayne",
  "phone": "+1-555-BAT-SIGNAL",
  "preferences": ["adventure", "relaxation"],
  "stay_start": "${new Date().toISOString().split('T')[0]}",
  "stay_end": "${new Date(Date.now() + 259200000).toISOString().split('T')[0]}",
  "notes": "VIP guest from Gotham. Prefers early schedules.",
  "bookings": [
    {
      "tour_id": "t2",
      "date": "${new Date().toISOString().split('T')[0]}",
      "slot": "afternoon",
      "price": 65.0
    }
  ]
}`}
                    </pre>
                  </div>
                </div>

                {/* Trigger Buttons */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
                    Trigger Webhook Simulation
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Quickly verify and test endpoint integrations by triggering live checked-in payloads for preset guests.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      className="btn-primary"
                      disabled={loading}
                      onClick={() => handlePMSSync({
                        guest_id: "g_pms_99",
                        name: "John Wick",
                        phone: "+1-212-CONTINENTAL",
                        preferences: ["relaxation", "indoor"],
                        stay_start: new Date().toISOString().split('T')[0],
                        stay_end: new Date(Date.now() + 259200000).toISOString().split('T')[0],
                        notes: "Traveling with a dog. Requires premium overwater spa decks.",
                        hotel_id: "hotel_lacoralina",
                        hotel_name: "La Coralina Island House",
                        bookings: [
                          {
                            tour_id: "t6",
                            date: new Date().toISOString().split('T')[0],
                            slot: "morning",
                            price: 75.0
                          }
                        ]
                      })}
                      style={{ padding: '12px', width: '100%', fontSize: '0.82rem' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      Sync Webhook for "John Wick" (La Coralina)
                    </button>

                    <button 
                      className="btn-secondary"
                      disabled={loading}
                      onClick={() => handlePMSSync({
                        guest_id: "g_pms_100",
                        name: "Lara Croft",
                        phone: "+44-20-TOMB-RAIDER",
                        preferences: ["adventure", "wildlife"],
                        stay_start: new Date().toISOString().split('T')[0],
                        stay_end: new Date(Date.now() + 259200000).toISOString().split('T')[0],
                        notes: "Enjoys extreme ziplining and cave explorations.",
                        hotel_id: "hotel_redfrog",
                        hotel_name: "Red Frog Beach Resort",
                        bookings: [
                          {
                            tour_id: "t2",
                            date: new Date().toISOString().split('T')[0],
                            slot: "afternoon",
                            price: 65.0
                          }
                        ]
                      })}
                      style={{ padding: '12px', width: '100%', fontSize: '0.82rem' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      Sync Webhook for "Lara Croft" (Red Frog Resort)
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Sub-Tab 3: Custom Tours Registration Portal */}
          {integrationTab === 'custom_tours' && (
            <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Interactive Registration Form Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Register New Local Excursion
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Create custom premium activities, eco-tours, or wellness experiences for your resort and sync them live to Amazon DynamoDB.
                  </p>
                </div>

                <form onSubmit={handleCustomTourSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Name field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Excursion Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Starfish Beach Eco-Kayak Adventure" 
                      value={customTourName}
                      onChange={(e) => setCustomTourName(e.target.value)}
                      style={{
                        background: 'var(--slot-empty-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.25s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Type field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Excursion Type</label>
                      <select 
                        value={customTourType}
                        onChange={(e) => setCustomTourType(e.target.value)}
                        style={{
                          background: 'var(--slot-empty-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="outdoor">Outdoor Adventure</option>
                        <option value="indoor">Indoor Experience</option>
                      </select>
                    </div>

                    {/* Price field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Price per Guest ($ USD)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="75.00"
                        value={customTourPrice}
                        onChange={(e) => setCustomTourPrice(e.target.value)}
                        style={{
                          background: 'var(--slot-empty-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Capacity field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Max Capacity (Guests)</label>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="10"
                        value={customTourCapacity}
                        onChange={(e) => setCustomTourCapacity(e.target.value)}
                        style={{
                          background: 'var(--slot-empty-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Location field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Isla Colon" 
                        value={customTourLocation}
                        onChange={(e) => setCustomTourLocation(e.target.value)}
                        style={{
                          background: 'var(--slot-empty-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Slots field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Available Time Slots</label>
                    <div style={{ display: 'flex', gap: '16px', background: 'var(--slot-empty-bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                           checked={customTourSlots.includes('morning')} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomTourSlots(prev => [...prev, 'morning']);
                            } else {
                              setCustomTourSlots(prev => prev.filter(s => s !== 'morning'));
                            }
                          }}
                          style={{ accentColor: 'var(--text-muted)', cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        Morning Slot
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                          checked={customTourSlots.includes('afternoon')} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomTourSlots(prev => [...prev, 'afternoon']);
                            } else {
                              setCustomTourSlots(prev => prev.filter(s => s !== 'afternoon'));
                            }
                          }}
                          style={{ accentColor: 'var(--text-muted)', cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        Afternoon Slot
                      </label>
                    </div>
                  </div>

                  {/* Description field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 550, color: 'var(--text-muted)' }}>Excursion Description</label>
                    <textarea 
                      placeholder="Give a vivid, high-fidelity description of this overwater or rainforest excursion..." 
                      rows="3"
                      value={customTourDesc}
                      onChange={(e) => setCustomTourDesc(e.target.value)}
                      style={{
                        background: 'var(--slot-empty-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <Magnet style={{ width: '100%', display: 'block' }} strength={12} padding={25}>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={loading}
                      style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', width: '100%' }}
                    >
                      {loading ? (
                        <span className="spinner"></span>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Publish Excursion to Amazon DynamoDB
                        </>
                      )}
                    </button>
                  </Magnet>

                </form>
              </div>

              {/* Active Registry Preview Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Active Excursion List Card */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                      Active Excursion Registry ({tours.length})
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--primary-glow)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '10px' }}>
                      DB Sync Live
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '430px', overflowY: 'auto', paddingRight: '4px' }}>
                    {tours.map((tour) => {
                      const isCustom = tour._id && tour._id.startsWith('t_custom');
                      return (
                        <div 
                          key={tour._id} 
                          style={{
                            background: isCustom ? 'rgba(212, 175, 55, 0.04)' : 'rgba(255,255,255,0.01)',
                            border: `1px solid ${isCustom ? 'rgba(212, 175, 55, 0.25)' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.25s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                                {tour.name}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {tour.type === 'outdoor' ? (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                                      <circle cx="12" cy="12" r="10" />
                                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                    </svg>
                                    <span>Outdoor Adventure</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                      <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    <span>Indoor Experience</span>
                                  </>
                                )}
                                <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span>{tour.location || 'Bocas'}</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '4px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                                ${tour.price}
                              </span>
                              {isCustom && (
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                  CUSTOM
                                </span>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: '1.4' }}>
                            {tour.description}
                          </p>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            {tour.slots && tour.slots.map(s => (
                              <span key={s} style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {s === 'morning' ? 'Morning' : 'Afternoon'}
                              </span>
                            ))}
                            <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', marginLeft: 'auto' }}>
                              Cap: {tour.capacity || 10}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Sub-Tab 4: Pre-Arrival Messaging & Logistics Dispatch Hub */}
          {integrationTab === 'messaging' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Dual Tab Segment selector inside the main panel */}
              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Pre-Arrival Guest Messaging & Logistics Dispatch
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontWeight: 300 }}>
                    Coordinate pre-arrival white-labeled guest communication and coordinate local transit operators dynamically.
                  </p>
                </div>
                
                {/* Segment Controls */}
                <div style={{ display: 'flex', background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))', padding: '4px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setMessagingSubTab('guest')}
                    style={{
                      background: messagingSubTab === 'guest' ? 'var(--primary)' : 'transparent',
                      color: messagingSubTab === 'guest' ? 'var(--primary-btn-text, #0f172a)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontWeight: messagingSubTab === 'guest' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)'
                    }}
                  >
                    Guest Pre-Arrival Previews
                  </button>
                  <button 
                    onClick={() => setMessagingSubTab('providers')}
                    style={{
                      background: messagingSubTab === 'providers' ? 'var(--primary)' : 'transparent',
                      color: messagingSubTab === 'providers' ? 'var(--primary-btn-text, #0f172a)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontWeight: messagingSubTab === 'providers' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)'
                    }}
                  >
                    Captains & Providers Dispatch
                  </button>
                </div>
              </div>

              {/* Sub-Tab Content */}
              {messagingSubTab === 'guest' ? (
                <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  
                  {/* Left Controls Pane */}
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary)' }}>
                        Message Customization Engine
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Customize, preview, and copy high-fidelity white-label emails and WhatsApp threads.
                      </p>
                    </div>

                    {/* Guest Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Onboarded Guest</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          value={messagingGuestId}
                          onChange={(e) => setMessagingGuestId(e.target.value)}
                          style={{
                            background: 'var(--bg-color, #ffffff)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            padding: '10px 12px',
                            fontSize: '0.85rem',
                            outline: 'none',
                            colorScheme: 'light',
                            cursor: 'pointer',
                            flex: 1
                          }}
                        >
                          {(guests || []).map(g => g && (
                            <option key={g._id} value={g._id}>{g.name} ({g.hotel_name || 'La Coralina'})</option>
                          ))}
                        </select>
                        {!['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'].includes(messagingGuestId) && (
                          <button
                            onClick={(e) => handleDeleteGuest(messagingGuestId, e)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              height: '40px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Modules Toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-card-nested, rgba(0, 0, 0, 0.03))', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Smart Copy Modules
                      </span>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={transferIncluded} 
                          onChange={(e) => setTransferIncluded(e.target.checked)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Coordinate Boat Transfer Call-to-Action
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={weatherNoteIncluded} 
                          onChange={(e) => setWeatherNoteIncluded(e.target.checked)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Climate-Smart Rainy Forecast Notice
                      </label>
                    </div>

                    {/* Quick Trigger Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                      <button 
                        onClick={() => {
                          const text = getWhatsAppMessageText(activeMessagingGuest);
                          navigator.clipboard.writeText(text);
                          setPushToastText("WhatsApp text copied to clipboard!");
                          setShowPushToast(true);
                          setTimeout(() => setShowPushToast(false), 3000);
                        }}
                        className="btn-primary"
                        style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy WhatsApp SMS Copy
                      </button>

                      <button 
                        onClick={() => {
                          const html = getEmailHtmlSource(activeMessagingGuest);
                          navigator.clipboard.writeText(html);
                          setPushToastText("Responsive HTML Email source code copied!");
                          setShowPushToast(true);
                          setTimeout(() => setShowPushToast(false), 3000);
                        }}
                        className="btn-secondary"
                        style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6"></polyline>
                          <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        Copy Responsive HTML Email Code
                      </button>

                      <button 
                        onClick={() => {
                          const subject = getEmailSubjectText(activeMessagingGuest);
                          setPushToastText(`📬 Mock Push Notification: "Email dispatched to ${activeMessagingGuest.name}: '${subject}'"`);
                          setShowPushToast(true);
                          setTimeout(() => setShowPushToast(false), 4500);
                          addLog(`📬 Pre-Arrival Email manually simulated and dispatched to ${activeMessagingGuest.name} (${activeMessagingGuest.phone})`);
                        }}
                        className="btn-secondary"
                        style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', border: '1px solid var(--border-color)', background: 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 2 11 13"></polyline>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        Simulate Guest Push (Email & SMS)
                      </button>
                    </div>
                  </div>

                  {/* Right Device previews */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Device Selector Pill */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'end' }}>
                      <button 
                        onClick={() => setPreviewChannel('whatsapp')}
                        style={{
                          background: previewChannel === 'whatsapp' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(255,255,255,0.01)',
                          border: `1px solid ${previewChannel === 'whatsapp' ? '#059669' : 'var(--border-color)'}`,
                          color: previewChannel === 'whatsapp' ? '#059669' : 'var(--text-muted)',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                        WhatsApp Smartphone Simulator
                      </button>
                      <button 
                        onClick={() => setPreviewChannel('email')}
                        style={{
                          background: previewChannel === 'email' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.01)',
                          border: `1px solid ${previewChannel === 'email' ? '#38bdf8' : 'var(--border-color)'}`,
                          color: previewChannel === 'email' ? '#38bdf8' : 'var(--text-muted)',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                        Responsive HTML Email Tablet Preview
                      </button>
                    </div>

                    {/* WhatsApp iPhone Mockup */}
                    {previewChannel === 'whatsapp' && (
                      <div className="glass-card" style={{
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'radial-gradient(circle at center, rgba(5, 150, 105, 0.05) 0%, transparent 70%)',
                        minHeight: '520px'
                      }}>
                        {/* iPhone Frame */}
                        <div style={{
                          width: '320px',
                          height: '560px',
                          background: '#0b141a',
                          border: '10px solid #22252a',
                          borderRadius: '36px',
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          {/* Notch */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '110px',
                            height: '18px',
                            background: '#22252a',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px',
                            zIndex: 10
                          }}></div>

                          {/* Chat Header */}
                          <div style={{
                            background: '#1f2c34',
                            padding: '24px 16px 10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            <img 
                              src={tenantBrand?.logo_url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=120&h=120&q=80'} 
                              alt="resort logo" 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--primary)' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                {activeMessagingGuest.hotel_name}
                              </span>
                              <span style={{ fontSize: '0.62rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669' }}></span>
                                Online Concierge
                              </span>
                            </div>
                          </div>

                          {/* Chat Body Wallpaper */}
                          <div style={{
                            flex: 1,
                            background: '#0b141a',
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 0)',
                            backgroundSize: '16px 16px',
                            padding: '16px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'end'
                          }}>
                            
                            {/* Encryption notice */}
                            <div style={{
                              alignSelf: 'center',
                              background: '#182229',
                              color: '#ffe69c',
                              fontSize: '0.62rem',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              textAlign: 'center',
                              marginBottom: '16px',
                              maxWidth: '90%',
                              lineHeight: '1.3'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffe69c' }}>
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                Messages are fully synchronized live with Amazon DynamoDB, secure token pre-authenticated.
                              </span>
                            </div>

                            {/* Guest Message bubble */}
                            <div style={{
                              alignSelf: 'flex-start',
                              background: '#005c4b',
                              color: '#e9edef',
                              fontSize: '0.78rem',
                              padding: '10px 12px',
                              borderRadius: '0px 12px 12px 12px',
                              maxWidth: '85%',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                              lineHeight: '1.45',
                              whiteSpace: 'pre-wrap',
                              position: 'relative'
                            }}>
                              {getWhatsAppMessageText(activeMessagingGuest)}
                              <span style={{ fontSize: '0.58rem', color: '#8696a0', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} [SENT]
                              </span>
                            </div>
                          </div>

                          {/* Chat Input Bar */}
                          <div style={{
                            background: '#1f2c34',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{ flex: 1, background: '#2a3942', borderRadius: '20px', padding: '6px 12px', fontSize: '0.75rem', color: '#8696a0' }}>
                              Type a message...
                            </div>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Email Tablet Browser Preview */}
                    {previewChannel === 'email' && (
                      <div className="glass-card" style={{
                        padding: '16px',
                        background: 'rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        
                        {/* Tablet Browser Chrome */}
                        <div style={{
                          background: '#1e293b',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px 12px 0 0',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          {/* Windows controls */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }}></span>
                          </div>

                          {/* Address Bar */}
                          <div style={{
                            flex: 1,
                            background: '#0f172a',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid rgba(255,255,255,0.04)'
                          }}>
                            <span>https://mail.google.com/inbox/preview</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                            </svg>
                          </div>
                        </div>

                        {/* Subject Bar */}
                        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Subject: {getEmailSubjectText(activeMessagingGuest)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            From: concierge@{activeMessagingGuest.hotel_id || 'lacoralina'}.com &lt;via Rain or Shine Autonomic Engine&gt;
                          </span>
                        </div>

                        {/* Responsive HTML Display inside an iframe sandbox mockup */}
                        <div style={{
                          background: '#0b0f19',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0 0 12px 12px',
                          height: '420px',
                          overflowY: 'auto',
                          padding: '10px',
                          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                          <div dangerouslySetInnerHTML={{ __html: getEmailHtmlSource(activeMessagingGuest) }} />
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              ) : (
                
                // Sub-Tab 2: Service Provider Logistics Dispatch Ledger
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Stats Banner Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    
                    <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--primary-glow)', border: '1.5px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{getDispatchItems().length}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Dispatches Queue</span>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.12)', border: '1.5px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{getDispatchItems().filter(i => i.status !== 'pending').length}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delivered Notifications</span>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1.5px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{getDispatchItems().filter(i => i.status === 'pending').length}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Actions</span>
                      </div>
                    </div>

                  </div>

                  {/* Active Booking Dispatch Ledger Card */}
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary)' }}>
                          Captains & Excursion Providers Dispatch Ledger
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                          Live logistical dispatch queue automatically derived by inspecting guest itineraries. Keep captains and farm operators synchronized.
                        </p>
                      </div>
                      <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '10px' }}>
                        Total: {getDispatchItems().length} Tasks
                      </span>
                    </div>

                    {getDispatchItems().length === 0 ? (
                      <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)' }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        No active dispatches required. All itineraries are empty or no guests are currently onboarded.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                              <th style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', padding: '10px 8px', fontWeight: 700 }}>Service Provider</th>
                              <th style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', padding: '10px 8px', fontWeight: 700 }}>Task Category</th>
                              <th style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', padding: '10px 8px', fontWeight: 700 }}>Dynamic Dispatch Message</th>
                              <th style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', padding: '10px 8px', fontWeight: 700 }}>Live Status</th>
                              <th style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', padding: '10px 8px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getDispatchItems().map((item) => {
                              const isPending = item.status === 'pending';
                              const isWhatsApp = item.status === 'whatsapp';
                              const isWebhook = item.status === 'webhook';

                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s', background: !isPending ? 'hsla(188, 55%, 38%, 0.01)' : 'transparent' }}>
                                  
                                  {/* Provider Name, Role, Phone */}
                                  <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.provider}</strong>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.role}</span>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{item.phone}</span>
                                    </div>
                                  </td>

                                  {/* Category Badge */}
                                  <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                                    <span style={{ 
                                      fontSize: '0.65rem', 
                                      padding: '2px 6px', 
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      letterSpacing: '0.03em',
                                      background: item.type === 'shuttle' ? 'rgba(56, 189, 248, 0.1)' : (item.type === 'weather' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 150, 105, 0.1)'),
                                      color: item.type === 'shuttle' ? '#38bdf8' : (item.type === 'weather' ? '#ef4444' : '#059669'),
                                      border: `1px solid ${item.type === 'shuttle' ? 'rgba(56, 189, 248, 0.2)' : (item.type === 'weather' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(5, 150, 105, 0.2)')}`
                                    }}>
                                      {item.type.toUpperCase()}
                                    </span>
                                  </td>

                                  {/* Notification Copy */}
                                  <td style={{ padding: '14px 8px', maxWidth: '300px', verticalAlign: 'top' }}>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.45' }}>{item.message}</p>
                                  </td>

                                  {/* Status badge */}
                                  <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                                    <span style={{ 
                                      fontSize: '0.68rem', 
                                      padding: '4px 8px', 
                                      borderRadius: '8px',
                                      fontWeight: 700,
                                      letterSpacing: '0.04em',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: isPending ? 'rgba(245, 158, 11, 0.12)' : (isWhatsApp ? 'rgba(5, 150, 105, 0.12)' : 'rgba(56, 189, 248, 0.12)'),
                                      color: isPending ? '#f59e0b' : (isWhatsApp ? '#059669' : '#38bdf8'),
                                      border: `1px solid ${isPending ? '#f59e0b' : (isWhatsApp ? '#059669' : '#38bdf8')}`,
                                      boxShadow: 'none'
                                    }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPending ? '#f59e0b' : (isWhatsApp ? '#059669' : '#38bdf8'), display: 'inline-block' }}></span>
                                      {isPending ? 'PENDING DISPATCH' : (isWhatsApp ? 'DELIVERED (WhatsApp)' : 'SYNCED (Webhook)')}
                                    </span>
                                  </td>

                                  {/* Dispatch triggers */}
                                  <td style={{ padding: '14px 8px', verticalAlign: 'top', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                                      <button
                                        onClick={() => handleNotifyProvider(item.id, 'whatsapp', item.provider, item.message)}
                                        className="btn-primary"
                                        style={{ 
                                          padding: '5px 10px', 
                                          fontSize: '0.68rem', 
                                          fontWeight: 700, 
                                          borderRadius: '4px',
                                          background: isWhatsApp ? '#059669' : 'var(--primary)',
                                          color: isWhatsApp ? '#ffffff' : 'var(--primary-btn-text, #0f172a)'
                                        }}
                                      >
                                        SMS/WA
                                      </button>
                                      
                                      <button
                                        onClick={() => handleNotifyProvider(item.id, 'webhook', item.provider, item.message)}
                                        className="btn-secondary"
                                        style={{ 
                                          padding: '5px 10px', 
                                          fontSize: '0.68rem', 
                                          fontWeight: 600, 
                                          borderRadius: '4px', 
                                          border: isWebhook ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                                          background: isWebhook ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                          color: isWebhook ? '#38bdf8' : 'var(--text-muted)'
                                        }}
                                      >
                                        Webhook
                                      </button>
                                    </div>
                                  </td>

                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}
          </div>
        </ErrorBoundary>
      )}

      {/* Premium responsive Itinerary updated modal/popup */}
      {showItineraryModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .modal-content-wrapper {
              animation: modalFadeIn 0.3s ease;
            }
            @media (max-width: 768px) {
              .modal-grid {
                grid-template-columns: 1fr !important;
                max-height: 95vh !important;
              }
              .modal-left {
                border-right: none !important;
                border-bottom: 1px solid var(--border-color) !important;
                padding: 20px !important;
              }
              .modal-right {
                padding: 20px !important;
              }
            }
          `}} />
          <div className="modal-content-wrapper modal-grid" style={{
            position: 'relative',
            width: '100%',
            maxWidth: '850px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            {/* Left side: QR Code, Action, Congrats badge */}
            <div className="modal-left" style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '20px',
              borderRight: '1px solid var(--border-color)',
              background: 'hsla(188, 86%, 50%, 0.03)'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-glow)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '8px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>Itinerary Updated!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', margin: 0 }}>
                Your activities have been successfully updated in Amazon DynamoDB. Scan the QR code below to save your new itinerary directly onto your phone!
              </p>
              
              {/* QR Code Container */}
              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                display: 'inline-block'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172b&data=${encodeURIComponent(
                    token 
                      ? `${window.location.origin}?token=${token}` 
                      : `${window.location.origin}?guest_id=${guestId}`
                  )}`} 
                  alt="Scan QR Code to save on phone" 
                  style={{ width: '150px', height: '150px', display: 'block' }}
                />
              </div>
              
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>
                Scan to save to your phone
              </span>

              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => window.print()}
                  style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Receipt
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowItineraryModal(false)}
                  style={{ 
                    flex: 1, 
                    padding: '10px 16px', 
                    fontSize: '0.83rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Return to talk to Concierge
                </button>
              </div>
            </div>

            {/* Right side: Interactive Scrollable ItineraryDoc rendering */}
            <div className="modal-right" style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              maxHeight: '90vh'
            }}>
              <ItineraryDoc itineraryMarkdown={itineraryMarkdown} guestId={guestId} />
            </div>

            {/* Absolute Close X Icon */}
            <button 
              onClick={() => setShowItineraryModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                transition: 'all 0.2s ease',
                zIndex: 10001
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {view === 'captain' && (
        <ErrorBoundary onReset={() => setView('landing')}>
          <CaptainPortal captainId={captainId} logistics={logistics} lang={lang} setLang={setLang} onBackToLanding={() => setView('landing')} />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;
