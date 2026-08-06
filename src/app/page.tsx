'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Compass,
  Bot,
  TrendingUp,
  Activity,
  FileText,
  Radio,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Layers,
  HelpCircle,
  Briefcase,
  Search,
  Bell,
  Terminal,
  Volume2,
  MapPin,
  AlertTriangle,
  Clock,
  Play,
  Cpu,
  User,
  LogOut,
  Settings,
  Loader2
} from 'lucide-react';
import { AuthProvider, useAuth, UserRole } from '../context/AuthContext';
import Login from '../components/Login';
import LogoutConfirm from '../components/LogoutConfirm';
import { useSimulation } from '../hooks/useSimulation';
import { Incident, Vehicle, Warehouse, Shelter, Hospital } from '../utils/mockData';
// Load IncidentAnalyzer dynamically to prevent SSR Leaflet reference errors
const IncidentAnalyzer = dynamic(() => import('../components/IncidentAnalyzer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-cyan-400 font-mono text-xs">
      LOADING AI INCIDENT SCANNER...
    </div>
  ),
});
import RescuePlanner from '../components/RescuePlanner';
import CitizenSOS from '../components/CitizenSOS';
import CitizenIncidentTracker from '../components/CitizenIncidentTracker';
import RiskPrediction from '../components/RiskPrediction';
import AIChatAssistant from '../components/AIChatAssistant';
import ReportGenerator from '../components/ReportGenerator';
import ResizablePanel from '../components/ResizablePanel';

// Load map dynamically to prevent SSR hydration errors
const CommandMap = dynamic(() => import('../components/CommandMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-cyan-400 font-mono">
      <span className="animate-pulse">LOADING DYNAMIC TACTICAL CARTOGRAPHY...</span>
    </div>
  ),
});

// Load Analytics dynamically
const AnalyticsDashboard = dynamic(() => import('../components/AnalyticsDashboard'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-cyan-400 font-mono text-xs">
      LOADING STATISTICAL ENGINE...
    </div>
  ),
});
function HomeDashboard() {
  const auth = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'admin' | 'citizen'>('landing');
  const [eocTime, setEocTime] = useState('');
  const [eocDate, setEocDate] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userLiveLocation, setUserLiveLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setEocTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setEocDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  const {
    incidents,
    setIncidents,
    vehicles,
    shelters,
    hospitals,
    warehouses,
    hazards,
    roadClosures,
    notifications,
    simulationHour,
    isSimulating,
    setIsSimulating,
    autopilotEnabled,
    setAutopilotEnabled,
    dispatchVehicle,
    addIncident,
    clearNotifications,
    toggleRoadClosure,
    addNotification
  } = useSimulation();

  const [activeConsoleTab, setActiveConsoleTab] = useState<'dispatch' | 'analyzer' | 'sos' | 'risk' | 'chat' | 'analytics' | 'reports'>('dispatch');
  const [sosConsoleRightTab, setSosConsoleRightTab] = useState<'inspect' | 'manual'>('inspect');
  const [forecastHours, setForecastHours] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const filteredIncidents = useMemo(() => {
    if (selectedCategory === 'All') return incidents;
    return incidents.filter(inc => inc.category === selectedCategory);
  }, [incidents, selectedCategory]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const handleUpdateIncident = useCallback((updated: Incident) => {
    setIncidents(prev => prev.map(inc => inc.id === updated.id ? updated : inc));
    setSelectedIncident(updated);
  }, [setIncidents]);
  
  // Design details
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Command Palette states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [autoDemoEnabled, setAutoDemoEnabled] = useState(false);


  // Toast stack state
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: string }[]>([]);

  // Trigger Toast notifications on new simulation announcements
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      setTimeout(() => {
        setToasts(prev => {
          if (prev.some(t => t.id === latest.id)) return prev;
          const newToast = { id: latest.id, title: latest.type.toUpperCase(), message: latest.message, type: latest.type };
          // auto dismiss in 4s
          setTimeout(() => {
            setToasts(curr => curr.filter(t => t.id !== latest.id));
          }, 4000);
          return [...prev, newToast].slice(-4); // max 4 toasts
        });
      }, 0);
    }
  }, [notifications]);

  // Distance helper for Auto Dispatch matching
  const getDistance = useCallback((loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Trigger AI assistant narration when incident selected
  const lastNotifiedIncidentId = useRef('');
  useEffect(() => {
    if (selectedIncident && selectedIncident.id !== lastNotifiedIncidentId.current) {
      lastNotifiedIncidentId.current = selectedIncident.id;
      setTimeout(() => {
        const type = selectedIncident.type;
        const nearest = vehicles.filter(v => v.status === 'Idle')[0];
        const details = nearest 
          ? `${nearest.name} dispatch en-route. ETA: ${nearest.etaMinutes || 4} mins.`
          : 'Evaluating closest dispatch units...';
        addNotification(
          `[AI COPILOT] ${type} crisis activated. ${details} Resolution window: ${selectedIncident.etaResolution}h. Nearest hospital NIMS notified.`,
          'info'
        );
      }, 0);
    }
  }, [selectedIncident, addNotification, vehicles]);

  // Auto-dispatch closest responder on selection or click
  useEffect(() => {
    if (selectedIncident && !selectedIncident.assignedVehicleId) {
      const handleAutoDispatch = setTimeout(() => {
        const eligible = vehicles.filter(v => v.status === 'Idle' && v.fuel > 15);
        if (eligible.length === 0) return;

        // Choose preferred vehicle type depending on incident class
        let preferredTypes: string[] = [];
        if (selectedIncident.type === 'Fire' || selectedIncident.type === 'Chemical Leak') {
          preferredTypes = ['Fire Truck', 'SDRF', 'NDRF'];
        } else if (selectedIncident.type === 'Flood' || selectedIncident.type === 'Cyclone') {
          preferredTypes = ['Boat', 'Helicopter', 'NDRF', 'SDRF'];
        } else if (selectedIncident.type === 'Landslide' || selectedIncident.type === 'Road Blockage' || selectedIncident.type === 'Power Failure') {
          preferredTypes = ['Road Clearance', 'Utility Repair', 'Police', 'Highway Patrol'];
        } else if (selectedIncident.type === 'Medical Emergency' || selectedIncident.type === 'Building Collapse') {
          preferredTypes = ['Ambulance', 'Mobile Medical'];
        }

        let candidates: Vehicle[] = eligible.filter(v => preferredTypes.includes(v.type as string));
        if (candidates.length === 0) {
          candidates = eligible;
        }

        let best: Vehicle | null = null;
        let minDist = Infinity;
        candidates.forEach(v => {
          const d = getDistance(v.location, selectedIncident.location);
          if (d < minDist) {
            minDist = d;
            best = v;
          }
        });

        if (best) {
          const targetVehicle = best as Vehicle;
          dispatchVehicle(targetVehicle.id, selectedIncident.id);
        }
      }, 300);
      return () => clearTimeout(handleAutoDispatch);
    }
  }, [selectedIncident, vehicles, dispatchVehicle, getDistance]);

  // Auto Demo Mode tick loop
  useEffect(() => {
    if (!autoDemoEnabled) return;

    const interval = setInterval(() => {
      const activeIncidents = incidents.filter(i => i.status !== 'Resolved');
      if (activeIncidents.length === 0) return;

      const currentIndex = activeIncidents.findIndex(i => i.id === selectedIncident?.id);
      const nextIndex = (currentIndex + 1) % activeIncidents.length;
      const nextInc = activeIncidents[nextIndex];

      setSelectedIncident(nextInc);
    }, 10000); // 10 seconds step

    return () => clearInterval(interval);
  }, [autoDemoEnabled, incidents, selectedIncident]);

  // Command Palette hotkey (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute stats
  const activeIncidentsCount = incidents.filter(i => i.status !== 'Resolved').length;
  const totalBeds = hospitals.reduce((acc, curr) => acc + curr.totalBeds, 0);
  const occupiedBeds = hospitals.reduce((acc, curr) => acc + curr.occupiedBeds, 0);
  const hospOccupancy = Math.round((occupiedBeds / totalBeds) * 100);

  // EOC Stats calculations
  const pendingSOSCount = incidents.filter(i => i.status === 'Pending').length;
  const totalRescued = incidents.filter(i => i.status === 'Resolved').length * 12 + 180;
  
  const ambulancesActive = vehicles.filter(v => (v.type === 'Ambulance' || v.type === 'Mobile Medical') && v.status !== 'Idle').length;
  const policeActive = vehicles.filter(v => (v.type === 'Police' || v.type === 'Highway Patrol' || v.type === 'Traffic Police') && v.status !== 'Idle').length;
  const fireActive = vehicles.filter(v => v.type === 'Fire Truck' && v.status !== 'Idle').length;
  const rescueTeamsActive = vehicles.filter(v => (v.type === 'NDRF' || v.type === 'SDRF') && v.status !== 'Idle').length;

  const toggleFaq = (index: number) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "How does TSDMA ResQAI coordinate NDRF and SDRF rescue operations?",
      a: "ResQAI leverages predictive routing models and heuristic dispatch engines to coordinate vehicles. By tracking live environmental telemetry (floods, fires, NH-65 highway roadblocks), the AI calculates optimal detour paths and matches incident characteristics with response fleet capabilities."
    },
    {
      q: "Is there support for offline mode during power grid outages in Telangana?",
      a: "Yes. ResQAI utilizes client-side progressive web application caches (PWA) and local neural net simulations to remain fully operational on standalone devices even during major power grid collapses or internet service outages."
    },
    {
      q: "Can citizens request rescue or coordinate voluntary relief services directly?",
      a: "Absolutely. Citizens can toggle their console role to 'Citizen' to access the distress SOS broadcast terminal and view verified safe routes and shelter availability statistics near Hyderabad and Warangal."
    }
  ];

  const handleCommandRun = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (trimmed === '/autopilot') {
      setAutopilotEnabled(!autopilotEnabled);
      addNotification('[AI COMMAND] Autopilot state toggled via command line.', 'info');
    } else if (trimmed === '/clear') {
      clearNotifications();
      addNotification('[AI COMMAND] Announcements cleared.', 'info');
    } else if (trimmed.startsWith('/sos ')) {
      const type = cmd.substring(5).trim();
      const mappedType = (type.charAt(0).toUpperCase() + type.slice(1)) as Incident['type'];
      addIncident({
        type: mappedType,
        category: 'Disaster Response',
        severity: 85,
        description: `Operator key-in report: Urgent ${type} emergency details.`,
        location: { lat: 17.3850 + (Math.random() - 0.5) * 0.08, lng: 78.4867 + (Math.random() - 0.5) * 0.08 },
        trappedCount: Math.floor(Math.random() * 4) + 2,
        casualtyEstimate: 0,
        requiredResources: ['SDRF Rescue Team'],
        reporter: 'Emergency Patrol',
        aiPriority: 'HIGH',
        etaResolution: 2
      });
    } else if (trimmed.startsWith('/view ')) {
      const tab = trimmed.substring(6).trim();
      const valid = ['dispatch', 'analyzer', 'sos', 'risk', 'chat', 'analytics', 'reports'];
      if (valid.includes(tab)) {
        setActiveConsoleTab(tab as 'dispatch' | 'analyzer' | 'sos' | 'risk' | 'chat' | 'analytics' | 'reports');
        setRightPanelOpen(true);
      }
    } else if (trimmed.startsWith('/focus ')) {
      const search = trimmed.substring(7).trim();
      const target = incidents.find(i => i.type.toLowerCase().includes(search) || i.id.toLowerCase() === search);
      if (target) {
        setSelectedIncident(target);
        addNotification(`[NAVIGATION] Map view focused on ${target.type} sector`, 'info');
      }
    }
    setCommandQuery('');
    setCommandPaletteOpen(false);
  };

  const navItems = [
    { id: 'dispatch', label: 'Logistics Dispatch', icon: Compass },
    { id: 'analyzer', label: 'AI Intel Analyzer', icon: Radio },
    { id: 'sos', label: 'Citizen SOS Feed', icon: Activity },
    { id: 'risk', label: 'Risk Projections', icon: TrendingUp },
    { id: 'chat', label: 'Chat Advisor', icon: Bot },
    { id: 'analytics', label: 'Analytics Graphs', icon: FileText },
    { id: 'reports', label: 'Report Briefings', icon: Briefcase }
  ];

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500 selection:text-black font-sans">
        {/* Navigation */}
        <nav className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black font-mono text-sm tracking-tighter">
                RQ
              </div>
              <span className="font-bold tracking-wider text-sm font-mono uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                TSDMA ResQAI
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentView('citizen')}
                className="px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 transition text-xs font-mono font-bold flex items-center gap-1"
              >
                👤 Citizen Portal
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-black hover:bg-cyan-500 transition text-xs font-mono font-bold flex items-center gap-1"
              >
                🛡️ EOC Admin Dashboard
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative py-24 md:py-36 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent opacity-70 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <div className="inline-flex items-center space-x-2 bg-cyan-950/30 border border-cyan-800/30 px-3 py-1 rounded-full text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Telangana Emergency Command Center Edition
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight hero-gradient-text leading-none">
              Predict. Dispatch. Coordinate.<br />
              Autonomous Disaster Response.
            </h1>
            
            <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto font-mono leading-relaxed">
              ResQAI coordinates real-time emergency responder fleets, predicts landslide hazards, and manages medical supply levels for TSDMA across Telangana.
            </p>

            <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={() => setCurrentView('citizen')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-cyan-500/50 hover:bg-cyan-950/30 text-cyan-400 font-bold text-xs font-mono tracking-widest uppercase transition"
              >
                👤 Enter Citizen Safety Portal
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-zinc-950 font-bold text-xs font-mono tracking-widest uppercase hover:brightness-110 transition shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                🛡️ Enter Admin EOC Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Feature Grid */}
        <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="premium-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-center justify-center text-cyan-400 font-mono">
              01
            </div>
            <h3 className="font-bold text-white text-sm uppercase font-mono">AI Command Dispatcher</h3>
            <p className="text-zinc-400 text-xs font-mono leading-relaxed">
              Autopilot heuristic routing matching NDRF, SDRF, and fire response crews with disaster parameters using Musi river flow constraints.
            </p>
          </div>
          <div className="premium-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-center justify-center text-cyan-400 font-mono">
              02
            </div>
            <h3 className="font-bold text-white text-sm uppercase font-mono">Live Weather Overlay</h3>
            <p className="text-zinc-400 text-xs font-mono leading-relaxed">
              Track real-time rainfall radars, wind vector warnings, and lightning strikes. Toggle predictive Musi river flooding heatmaps.
            </p>
          </div>
          <div className="premium-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-center justify-center text-cyan-400 font-mono">
              03
            </div>
            <h3 className="font-bold text-white text-sm uppercase font-mono">Citizen SOS Integration</h3>
            <p className="text-zinc-400 text-xs font-mono leading-relaxed">
              Allows citizen-end access to voluntary relief hubs, medical beds indices, and a simple interface to file search-and-rescue tickets.
            </p>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="max-w-3xl mx-auto px-6 py-16 border-t border-white/5">
          <h2 className="text-center font-mono text-base uppercase font-bold tracking-widest text-zinc-300 mb-8">
            Frequently Asked Operations Questions
          </h2>
          <div className="space-y-4 font-mono text-xs">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-white/5 rounded-xl bg-zinc-900/20 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 font-bold flex justify-between items-center text-zinc-300 hover:text-white transition"
                >
                  <span>{faq.q}</span>
                  <span className="text-cyan-400">{faqOpenIndex === idx ? '−' : '+'}</span>
                </button>
                {faqOpenIndex === idx && (
                  <div className="p-4 pt-0 text-zinc-500 border-t border-white/5 bg-zinc-950/40 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 text-center text-zinc-500 text-[10px] font-mono">
          <p>© 2026 Telangana State Disaster Management Authority (TSDMA). Operational Grade AI System.</p>
        </footer>
      </div>
    );
  }

  if (currentView === 'citizen') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500 selection:text-black font-sans flex flex-col">
        {/* Navigation */}
        <nav className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-black font-mono text-sm tracking-tighter">
                RQ
              </div>
              <span className="font-bold tracking-wider text-sm font-mono uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                TSDMA Citizen Safety Portal
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-widest animate-pulse">
                Live Public Channel
              </span>
              <button
                onClick={() => setCurrentView('landing')}
                className="px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white transition text-xs font-mono"
              >
                Back to Home
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-black hover:bg-cyan-500 transition text-xs font-mono font-bold"
              >
                🛡️ Admin Panel
              </button>
            </div>
          </div>
        </nav>

        {/* Banner */}
        <div className="bg-amber-950/40 border-b border-amber-500/20 px-6 py-2 flex items-center justify-center space-x-2 text-amber-300 font-mono text-xs">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>🚨 <strong>HYDERABAD METEOROLOGICAL ALERT:</strong> Flood water watermarks registered at Musi River Basin. Avoid low-lying corridors.</span>
        </div>

        {/* Content Portal Grid */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Col: Citizen SOS & Staging Feeds */}
          <div className="space-y-6 flex flex-col">
            
            {/* Citizen Safety Console (SOS Report & Live Tracking) */}
            <div className="glass-panel p-5 rounded-2xl flex-shrink-0 flex flex-col min-h-[500px]">
              <CitizenIncidentTracker 
                incidents={incidents}
                vehicles={vehicles}
                selectedIncident={selectedIncident}
                onSelectIncident={setSelectedIncident}
                onAddIncident={(inc) => {
                  const newInc = addIncident({
                    ...inc,
                    reporter: 'Citizen Portal'
                  });
                  if (newInc) {
                    setSelectedIncident(newInc);
                  }
                }}
                addNotification={addNotification}
                onUpdateIncident={handleUpdateIncident}
              />
            </div>

            {/* Public Staging Shelters Directory */}
            <div className="premium-card p-5 rounded-2xl flex-1 space-y-4">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono border-b border-white/5 pb-2">
                <Compass className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Voluntary Relief Shelters</span>
              </div>
              <div className="space-y-3 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                {shelters.map((sh) => (
                  <div key={sh.id} className="p-2.5 bg-zinc-900/50 border border-white/5 rounded-lg flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white uppercase">{sh.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Status: Operational</div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold">{sh.capacity - sh.occupied} / {sh.capacity} Vacant</span>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Evacuees Staged</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Helpline Directory */}
            <div className="premium-card p-5 rounded-2xl flex-shrink-0 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-3 border-b border-white/5 pb-1">Emergency Directory</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 bg-white/5 border border-white/5 rounded">
                  <div className="text-zinc-500 uppercase">National Helpline</div>
                  <div className="font-bold text-white mt-0.5">1070</div>
                </div>
                <div className="p-2 bg-white/5 border border-white/5 rounded">
                  <div className="text-zinc-500 uppercase">Ambulance Services</div>
                  <div className="font-bold text-white mt-0.5">108</div>
                </div>
                <div className="p-2 bg-white/5 border border-white/5 rounded">
                  <div className="text-zinc-500 uppercase">Fire Control</div>
                  <div className="font-bold text-white mt-0.5">101</div>
                </div>
                <div className="p-2 bg-white/5 border border-white/5 rounded">
                  <div className="text-zinc-500 uppercase">Police Desk</div>
                  <div className="font-bold text-white mt-0.5">100</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Public Staging Map (Hides tactical coordinates) */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            <div className="glass-panel p-4 rounded-2xl flex-1 flex flex-col relative min-h-[500px]">
              <div className="flex items-center justify-between mb-3 font-mono">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">TSDMA Public Evacuation Map</span>
                </div>
                <span className="text-[10px] text-zinc-500">Hiding tactical fleet vectors for operational security.</span>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative">
                <CommandMap 
                  incidents={filteredIncidents}
                  vehicles={[]} // Hide tactical EOC fleet from public portal
                  shelters={shelters}
                  hospitals={hospitals}
                  warehouses={[]} // Hide logistical centers
                  hazards={hazards}
                  roadClosures={roadClosures}
                  onToggleRoadClosure={() => {}} // Disabled for citizens
                  selectedIncident={selectedIncident}
                  onSelectIncident={onSelectIncident => setSelectedIncident(onSelectIncident)}
                  selectedVehicle={null}
                  onSelectVehicle={() => {}}
                  forecastHours={forecastHours}
                  onForecastHoursChange={setForecastHours}
                  userLocation={userLiveLocation}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // EOC Admin Dashboard route guard: only accessible to authenticated officials
  if (!auth.isAuthenticated) {
    return <Login onBackToPortal={() => setCurrentView('landing')} />;
  }

  // ==========================================
  // DASHBOARD WORKSPACE (PALANTIR REDESIGN)
  // ==========================================
  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-white font-mono flex relative selection:bg-cyan-500 selection:text-black">
      
      {/* Toast Notification HUD stack */}
      <div className="toast-container fixed top-5 right-5 space-y-2 max-w-sm pointer-events-none z-[9999]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto p-3.5 rounded-xl glass-panel-floating border-l-4 border-l-cyan-400 text-[10px] animate-slide-in flex justify-between items-start space-x-3"
          >
            <div className="space-y-1">
              <span className="font-bold text-cyan-400 uppercase tracking-widest block">{toast.title}</span>
              <p className="text-zinc-300 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(curr => curr.filter(t => t.id !== toast.id))}
              className="text-zinc-500 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Ctrl+K Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel-floating rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <Terminal className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-widest">TSDMA Command Palette</span>
              </div>
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command (e.g. /autopilot, /clear, /sos fire, /view chat)..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommandRun(commandQuery);
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Suggested Shortcuts:</span>
              <div className="grid grid-cols-2 gap-1 text-[9px] text-zinc-400">
                <button onClick={() => handleCommandRun('/autopilot')} className="text-left hover:text-white p-1 hover:bg-white/5 rounded">/autopilot (Toggle AI Autopilot)</button>
                <button onClick={() => handleCommandRun('/clear')} className="text-left hover:text-white p-1 hover:bg-white/5 rounded">/clear (Flush notifications)</button>
                <button onClick={() => handleCommandRun('/sos flood')} className="text-left hover:text-white p-1 hover:bg-white/5 rounded">/sos [flood/fire] (Injected SOS)</button>
                <button onClick={() => handleCommandRun('/view chat')} className="text-left hover:text-white p-1 hover:bg-white/5 rounded">/view [tab] (Switch panels)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          LEFT COLLAPSIBLE SIDEBAR OVERLAY
          ========================================== */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`glass-panel-floating z-[1001] fixed left-5 top-5 bottom-5 flex flex-col justify-between p-4 rounded-2xl sidebar-transition overflow-hidden ${
          sidebarExpanded ? 'w-60 bg-zinc-950/95' : 'w-16 bg-zinc-950/70'
        }`}
      >
        <div className="space-y-6">
          {/* Logo Tag */}
          <div className="flex items-center space-x-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-xs font-mono tracking-tighter flex-shrink-0">
              RQ
            </div>
            <span
              className={`font-bold tracking-wider text-xs uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent whitespace-nowrap transition-opacity duration-300 ${
                sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'
              }`}
            >
              TSDMA ResQAI
            </span>
          </div>

          <div className="h-[1px] bg-white/5"></div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeConsoleTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveConsoleTab(item.id as 'dispatch' | 'analyzer' | 'sos' | 'risk' | 'chat' | 'analytics' | 'reports');
                    setRightPanelOpen(true);
                  }}
                  className={`w-full flex items-center p-2 rounded-xl transition text-[10px] uppercase font-bold relative group ${
                    isActive ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span
                    className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
                      sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'
                    }`}
                  >
                    {item.label}
                  </span>
                  {!sidebarExpanded && (
                    <div className="absolute left-16 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none text-[8px] z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 relative">
          <div className="h-[1px] bg-white/5"></div>

          {/* EOC Profile Card & Dynamic Role Selector */}
          {sidebarExpanded ? (
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-xl">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs font-mono flex-shrink-0">
                    {auth.user?.role.split(' ').map(w => w[0]).join('') || 'DO'}
                  </div>
                  <div className="text-left leading-tight min-w-0">
                    <div className="text-[9px] font-bold text-white truncate">{auth.user?.username.split('@')[0]}</div>
                    <div className="text-[7px] text-zinc-500 truncate uppercase mt-0.5">{auth.user?.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="text-zinc-500 hover:text-white transition p-1 outline-none flex-shrink-0"
                  title="Switch EOC Role"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Role Dropdown Menu */}
              {roleMenuOpen && (
                <div className="absolute bottom-28 left-0 right-0 bg-zinc-950 border border-white/10 p-1.5 rounded-xl shadow-2xl space-y-1 z-[1100]">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest block px-1.5 py-0.5">Switch EOC Role</span>
                  {(['Department Official', 'Administrator', 'Emergency Coordinator', 'Incident Operator', 'Field Officer'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        auth.updateRole(r);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded-lg text-[8px] uppercase transition font-mono ${
                        auth.user?.role === r ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setSidebarExpanded(true);
                setRoleMenuOpen(true);
              }}
              className="w-full flex items-center justify-center p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 hover:text-white hover:bg-cyan-950/80 transition relative group"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <div className="absolute left-16 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none text-[8px] z-50">
                {auth.user?.role || 'Switch Role'}
              </div>
            </button>
          )}

          {/* Quick Exit */}
          <button
            onClick={() => setCurrentView('landing')}
            className={`w-full py-2 bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 hover:border-zinc-700 text-zinc-400 hover:text-white transition rounded-xl text-center flex items-center justify-center gap-2 ${
              sidebarExpanded ? 'text-[10px]' : 'text-xs'
            }`}
          >
            <span>🚪</span>
            <span className={sidebarExpanded ? 'inline' : 'hidden'}>Back to Portal</span>
          </button>

          {/* Secure Logout Trigger */}
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className={`w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 transition rounded-xl text-center flex items-center justify-center gap-2 ${
              sidebarExpanded ? 'text-[10px] font-bold uppercase tracking-wider' : 'text-xs'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className={sidebarExpanded ? 'inline' : 'hidden'}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          MAP COMPONENT (100% CONTAINER BACKING)
          ========================================== */}
      <div className="flex-1 h-full w-full relative z-0">
        <CommandMap
          incidents={filteredIncidents}
          vehicles={vehicles}
          shelters={shelters}
          hospitals={hospitals}
          warehouses={warehouses}
          hazards={hazards}
          roadClosures={roadClosures}
          onToggleRoadClosure={toggleRoadClosure}
          selectedIncident={selectedIncident}
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setSelectedVehicle(null); // Deselect vehicle on incident click
            setActiveConsoleTab('dispatch');
            setRightPanelOpen(true);
          }}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={setSelectedVehicle}
          forecastHours={forecastHours}
          onForecastHoursChange={setForecastHours}
          userLocation={userLiveLocation}
        />



        {/* ==========================================
            FLOATING TOP STATUS HUD BAR
            ========================================== */}
        <section className={`absolute top-5 z-[1000] flex flex-wrap gap-2.5 max-w-[calc(100vw-350px)] pointer-events-none transition-all duration-300 ${
          sidebarExpanded ? 'left-68' : 'left-24'
        }`}>
          {/* Welcome EOC Info Badge */}
          <div className="pointer-events-auto bg-zinc-950/90 backdrop-blur-md border border-cyan-500/20 rounded-xl p-2.5 shadow-lg flex items-center gap-3 font-mono">
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute top-0.5 left-0.5"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950 relative"></div>
            </div>
            <div className="leading-tight text-left min-w-[210px] md:min-w-[240px]">
              <div className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Welcome, {auth.user?.role || 'Officer'}</span>
                <span className="text-[7px] font-normal text-emerald-400 border border-emerald-500/20 px-1 rounded bg-emerald-950/40">ONLINE</span>
              </div>
              <div className="text-[8px] text-zinc-500 mt-0.5 flex items-center gap-x-2 flex-wrap">
                <span>{eocDate}</span>
                <span className="text-zinc-300 font-bold">{eocTime}</span>
                <span className="text-cyan-500 font-semibold">TSDMA EOC: ACTIVE</span>
                <span className="text-emerald-500 font-bold">SYSTEMS: 100% OK</span>
              </div>
            </div>
          </div>

          <div className="pointer-events-auto bg-zinc-950/75 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg w-28 md:w-36 flex flex-col justify-between">
            <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">Active Emergencies</span>
            <span className="text-red-500 font-bold text-xs md:text-sm block mt-0.5 animate-pulse">{activeIncidentsCount} Cases</span>
          </div>
          <div className="pointer-events-auto bg-zinc-950/75 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg w-28 md:w-36 flex flex-col justify-between">
            <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">Citizens Rescued</span>
            <span className="text-emerald-400 font-bold text-xs md:text-sm block mt-0.5">{totalRescued} Rescued</span>
          </div>
          <div className="pointer-events-auto bg-zinc-950/75 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg w-28 md:w-36 flex flex-col justify-between">
            <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">Pending SOS Intake</span>
            <span className="text-orange-400 font-bold text-xs md:text-sm block mt-0.5">{pendingSOSCount} Queue</span>
          </div>
          <div className="pointer-events-auto bg-zinc-950/75 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg w-28 md:w-36 flex flex-col justify-between">
            <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">EMS Active Fleet</span>
            <span className="text-cyan-400 font-bold text-xs md:text-sm block mt-0.5">{ambulancesActive}A | {fireActive}F | {policeActive}P</span>
          </div>
          <div className="pointer-events-auto bg-zinc-950/75 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg w-28 md:w-36 flex flex-col justify-between">
            <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">NDRF/SDRF Crews</span>
            <span className="text-white font-bold text-xs md:text-sm block mt-0.5">{rescueTeamsActive} Crews</span>
          </div>
        </section>

        {/* ==========================================
            FLOATING TOP RIGHT LOGISTICS CONTROLS
            ========================================== */}
        <div className="absolute top-5 right-5 z-[1000] flex items-center space-x-2.5">
          <div className="pointer-events-auto bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-4 text-[10px] shadow-2xl font-mono border-cyan-500/10">
            {/* Auto Demo Control */}
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 uppercase text-[8px] tracking-wider">Demo:</span>
              <button
                onClick={() => setAutoDemoEnabled(!autoDemoEnabled)}
                className={`px-2 py-0.5 text-[8px] font-bold rounded-lg transition-all duration-200 border ${
                  autoDemoEnabled 
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse' 
                    : 'bg-black/40 text-zinc-500 border-white/5 hover:text-white hover:border-zinc-600'
                }`}
              >
                {autoDemoEnabled ? 'ACTIVE' : 'STANDBY'}
              </button>
            </div>

            <div className="w-[1px] h-4 bg-white/10"></div>

            {/* Autopilot Control */}
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 uppercase text-[8px] tracking-wider">Autopilot:</span>
              <button
                onClick={() => setAutopilotEnabled(!autopilotEnabled)}
                className={`px-2 py-0.5 text-[8px] font-bold rounded-lg transition-all duration-200 border ${
                  autopilotEnabled 
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.2)]' 
                    : 'bg-black/40 text-zinc-500 border-white/5 hover:text-white hover:border-zinc-600'
                }`}
              >
                {autopilotEnabled ? 'ENGAGED' : 'OFFLINE'}
              </button>
            </div>
            
            <div className="w-[1px] h-4 bg-white/10"></div>
            
            {/* Simulation Speed Control */}
            <div className="flex items-center gap-2">
              <Activity className={`w-3.5 h-3.5 ${isSimulating ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
              <span className="text-zinc-400 uppercase text-[8px] tracking-wider">Sim:</span>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-2 py-0.5 text-[8px] font-bold rounded-lg transition-all duration-200 border ${
                  isSimulating 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' 
                    : 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse'
                }`}
              >
                {isSimulating ? 'RUNNING' : 'PAUSED'}
              </button>
            </div>

            <div className="w-[1px] h-4 bg-white/10"></div>

            {/* Simulation Timer */}
            <div className="flex items-center gap-2 text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 uppercase text-[8px] tracking-wider">Elapsed:</span>
              <span className="font-bold text-[10px] text-cyan-400">{simulationHour.toFixed(1)}h</span>
            </div>
          </div>

          {/* Search Toggle button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="pointer-events-auto p-2.5 bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-zinc-900/90 text-zinc-400 hover:text-white transition shadow-2xl flex items-center justify-center gap-2 text-[9px] border-cyan-500/50 hover:border-cyan-400"
            title="Open EOC Command terminal (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-500 border border-white/10 rounded px-1.5 py-0.5 text-[8px] font-mono hidden md:inline">Ctrl+K</span>
          </button>

          {/* Toggle Right Drawer button if closed */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="pointer-events-auto p-2.5 bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-zinc-900/90 text-cyan-400 hover:text-cyan-300 transition shadow-2xl flex items-center justify-center gap-1.5 text-[9px] border-cyan-500/50"
            >
              <ChevronRight className="w-4 h-4 rotate-180 text-cyan-400" />
              <span className="font-mono font-bold tracking-wider uppercase text-[8px] hidden md:inline">Show Console</span>
            </button>
          )}
        </div>

        {/* ==========================================
            FLOATING RIGHT TACTICAL PANEL (DRAWER)
            ========================================== */}
        <ResizablePanel
          isOpen={rightPanelOpen}
          onClose={() => setRightPanelOpen(false)}
          storageKey="tsdma-eoc-resizable-panel-shared"
          title={
            activeConsoleTab === 'dispatch' ? 'Tactical Logistics' :
            activeConsoleTab === 'analyzer' ? 'AI Incident Scanner' :
            activeConsoleTab === 'sos' ? 'DistressSOS Portal' :
            activeConsoleTab === 'risk' ? 'Timeline Forecast' :
            activeConsoleTab === 'chat' ? 'Crisis Copilot AI' :
            activeConsoleTab === 'analytics' ? 'Metrics Report' : 'Briefing Dossiers'
          }
          subtitle={
            activeConsoleTab === 'dispatch' ? 'Dispatch ambulances, engines & SDRF squads' :
            activeConsoleTab === 'analyzer' ? 'Ingest scans & weather briefs' :
            activeConsoleTab === 'sos' ? 'Citizens distress broadcasts' :
            activeConsoleTab === 'risk' ? 'Musi flood water spread metrics' :
            activeConsoleTab === 'chat' ? 'EOC coordination conversational assistant' :
            activeConsoleTab === 'analytics' ? 'Operational response charts' : 'Compiled administrative briefs'
          }
        >
          {activeConsoleTab === 'dispatch' && (
            <RescuePlanner
              incidents={filteredIncidents}
              vehicles={vehicles}
              warehouses={warehouses}
              shelters={shelters}
              hospitals={hospitals}
              hazards={hazards}
              roadClosures={roadClosures}
              onDispatchVehicle={dispatchVehicle}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                setSelectedVehicle(null); // Deselect vehicle on incident click
                // Also trigger toast warning
                if (inc) {
                  addNotification(`[AI SYSTEM] AI Incident Activated: Focus centered on ${inc.type}.`, 'info');
                }
              }}
              addNotification={addNotification}
              triggerSupplyDelivery={() => {}}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              selectedCategory={selectedCategory}
              onChangeCategory={setSelectedCategory}
              onUpdateIncident={handleUpdateIncident}
            />
          )}

          {activeConsoleTab === 'analyzer' && (
            <IncidentAnalyzer
              onAddIncident={(inc) => {
                const newInc = addIncident(inc);
                if (newInc) setSelectedIncident(newInc);
              }}
              addNotification={addNotification}
            />
          )}

          {activeConsoleTab === 'sos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full font-mono text-xs text-white">
              {/* Left Column: SOS Distress Feed (2/3 width) */}
              <div className="lg:col-span-2 glass-panel p-4 rounded-xl flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-3">
                  <div className="flex items-center gap-2 text-red-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                    <span>ACTIVE CITIZEN SOS DISTRESS BOARD</span>
                  </div>
                  <span className="text-[9px] text-zinc-500">
                    Showing all distress tickets raised by citizens
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {incidents.filter(inc => inc.reporter === 'Citizen SOS' || inc.reporter === 'Citizen Portal' || inc.needsSOSValidation).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 italic text-[11px]">
                      NO ACTIVE CITIZEN DISTRESS SIGNALS REGISTERED
                    </div>
                  ) : (
                    incidents
                      .filter(inc => inc.reporter === 'Citizen SOS' || inc.reporter === 'Citizen Portal' || inc.needsSOSValidation)
                      .map((inc) => {
                        const isSelected = selectedIncident?.id === inc.id;
                        const isPending = inc.needsSOSValidation || inc.status === 'Pending';
                        
                        let emoji = '🚨';
                        let glowColor = 'rgba(239,68,68,0.2)';
                        let bgGlow = 'bg-red-500/10 text-red-400 border-red-500/20';

                        if (inc.type === 'Flood') {
                          emoji = '🌊';
                          glowColor = 'rgba(56,189,248,0.25)';
                          bgGlow = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                        } else if (inc.type === 'Fire') {
                          emoji = '🔥';
                          glowColor = 'rgba(249,115,22,0.25)';
                          bgGlow = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                        } else if (inc.type === 'Chemical Leak') {
                          emoji = '☢️';
                          glowColor = 'rgba(168,85,247,0.25)';
                          bgGlow = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                        } else if (inc.type === 'Building Collapse' || inc.type === 'Landslide') {
                          emoji = '🏢';
                          glowColor = 'rgba(245,158,11,0.25)';
                          bgGlow = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        } else if (inc.type === 'Snake Sighting' || inc.type === 'Injured Stray Animal') {
                          emoji = '🐍';
                          glowColor = 'rgba(20,184,166,0.25)';
                          bgGlow = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
                        } else if (inc.type === 'Medical Emergency') {
                          emoji = '🚑';
                          glowColor = 'rgba(236,72,153,0.25)';
                          bgGlow = 'bg-pink-500/10 text-pink-400 border-pink-500/20';
                        }

                        return (
                          <button
                            key={inc.id}
                            onClick={() => {
                              setSelectedIncident(inc);
                              setSosConsoleRightTab('inspect');
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col space-y-2.5 ${
                              isSelected
                                ? 'bg-zinc-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                                : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60'
                            }`}
                            style={{
                              boxShadow: isSelected ? `0 0 20px ${glowColor}, inset 0 0 12px ${glowColor}` : undefined
                            }}
                          >
                            <div className="flex justify-between items-start w-full">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border font-mono text-sm shadow-inner ${bgGlow}`}>
                                  {emoji}
                                </div>
                                
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white uppercase text-[11px] tracking-wide">{inc.type}</span>
                                    <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 uppercase tracking-widest font-mono scale-95 origin-left">
                                      {inc.reporter}
                                    </span>
                                  </div>
                                  <span className="text-[8px] text-slate-500 font-mono">ID: {inc.id} • Registered {inc.reportedAt}</span>
                                </div>
                              </div>

                              <div className="text-right space-y-1">
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider inline-block font-mono ${
                                  isPending 
                                    ? 'bg-red-950/40 text-red-400 border-red-500/30 animate-pulse' 
                                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                                }`}>
                                  {isPending ? 'Pending' : inc.status}
                                </span>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans pr-4 line-clamp-2">
                              {inc.description}
                            </p>

                            <div className="w-full space-y-1.5 pt-1.5 border-t border-white/5 flex flex-col">
                              <div className="flex justify-between items-center text-[8.5px] text-slate-500 font-mono">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>LAT: {inc.location.lat.toFixed(5)} • LNG: {inc.location.lng.toFixed(5)}</span>
                                </div>
                                <span className="font-bold text-amber-500/90">{inc.severity}% SEVERITY</span>
                              </div>

                              <div className="w-full bg-black/40 border border-white/5 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                                    inc.severity >= 75 
                                      ? 'from-red-600 to-orange-500 shadow-[0_0_6px_rgba(220,38,38,0.5)]' 
                                      : inc.severity >= 50 
                                      ? 'from-orange-500 to-amber-400' 
                                      : 'from-amber-400 to-emerald-400'
                                  }`}
                                  style={{ width: `${inc.severity}%` }}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: SOS Inspector & Form Tabs (1/3 width) */}
              <div className="space-y-4 flex flex-col h-full min-h-[400px]">
                {/* Tabs */}
                <div className="flex border-b border-white/5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSosConsoleRightTab('inspect')}
                    className={`flex-1 pb-2 text-center font-bold tracking-wider uppercase transition-colors text-[9px] ${
                      sosConsoleRightTab === 'inspect'
                        ? 'border-b-2 border-cyan-500 text-cyan-400 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    🔍 Inspect Distress
                  </button>
                  <button
                    type="button"
                    onClick={() => setSosConsoleRightTab('manual')}
                    className={`flex-1 pb-2 text-center font-bold tracking-wider uppercase transition-colors text-[9px] ${
                      sosConsoleRightTab === 'manual'
                        ? 'border-b-2 border-red-500 text-red-400 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    ➕ Raise Manual SOS
                  </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                  {sosConsoleRightTab === 'inspect' ? (
                    /* SOS Inspector tab */
                    <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col justify-between overflow-y-auto space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">SOS Ticket Inspector</span>
                        
                        {selectedIncident && (selectedIncident.reporter === 'Citizen SOS' || selectedIncident.reporter === 'Citizen Portal' || selectedIncident.needsSOSValidation) ? (
                          <div className="space-y-3 bg-black/40 border border-white/5 p-3 rounded-lg text-xs">
                            <div>
                              <div className="text-red-400 font-bold uppercase">{selectedIncident.type}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5">Ticket ID: {selectedIncident.id}</div>
                            </div>
                            
                            <p className="text-[10px] text-slate-300 italic bg-white/5 p-2 rounded">
                              &quot;{selectedIncident.description}&quot;
                            </p>

                            {/* Verification Controls */}
                            {selectedIncident.needsSOSValidation ? (
                              <div className="space-y-2 border-t border-white/15 pt-2">
                                <div className="text-[9px] text-yellow-400 font-bold animate-pulse">⚠️ REQUIRES CONFIRMATION</div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const verified = {
                                        ...selectedIncident,
                                        needsSOSValidation: false,
                                        status: 'Reported' as const
                                      };
                                      addNotification(`SOS VERIFIED: Distress approved at location.`, 'success');
                                      handleUpdateIncident(verified);
                                    }}
                                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] font-bold rounded uppercase tracking-wider transition"
                                  >
                                    Verify SOS
                                  </button>
                                  <button
                                    onClick={() => {
                                      const dismissed = {
                                        ...selectedIncident,
                                        needsSOSValidation: false,
                                        status: 'Resolved' as const
                                      };
                                      addNotification(`SOS DISMISSED: Report resolved and closed.`, 'warning');
                                      handleUpdateIncident(dismissed);
                                      setSelectedIncident(null);
                                    }}
                                    className="flex-1 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-[9px] font-bold rounded uppercase tracking-wider transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 border-t border-white/15 pt-2">
                                <div className="text-emerald-400 font-bold text-[9px] flex items-center gap-1">
                                  <span>✅ VERIFIED DISTRESS TICKET</span>
                                </div>
                                <p className="text-[9px] text-slate-400">
                                  Status: <strong className="text-white uppercase">{selectedIncident.status}</strong>
                                </p>
                                <div className="flex gap-1.5">
                                  {['Active', 'Resolved'].map((st) => (
                                    <button
                                      key={st}
                                      onClick={() => {
                                        const updated = {
                                          ...selectedIncident,
                                          status: st as Incident['status']
                                        };
                                        addNotification(`SOS STATUS UPDATE: Ticket ${selectedIncident.id} marked as ${st}.`, 'info');
                                        handleUpdateIncident(updated);
                                      }}
                                      className="px-2 py-1 rounded bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-[9px] text-slate-300 transition"
                                    >
                                      Set {st}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-600 text-[10px] flex flex-col justify-center items-center h-full">
                            <Activity className="w-8 h-8 text-zinc-800 mb-2 animate-pulse" />
                            <span>Select an SOS distress ticket from the feed to inspect and verify.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Raise New SOS Form tab */
                    <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col justify-between overflow-y-auto">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2 font-bold text-slate-400">Raise manual distress ticket</span>
                      <div className="flex-1 overflow-y-auto">
                        <CitizenSOS
                          onAddIncident={(inc) => {
                            const newInc = addIncident({
                              ...inc,
                              reporter: 'Citizen SOS',
                              needsSOSValidation: true
                            });
                            if (newInc) {
                              setSelectedIncident(newInc);
                              setSosConsoleRightTab('inspect');
                            }
                          }}
                          addNotification={addNotification}
                          onLocationLock={setUserLiveLocation}
                          compact={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeConsoleTab === 'risk' && (
            <RiskPrediction
              incidents={incidents}
              shelters={shelters}
              hospitals={hospitals}
              hospOccupancy={hospOccupancy}
              simulationHour={simulationHour}
              forecastHours={forecastHours}
              setForecastHours={setForecastHours}
            />
          )}

          {activeConsoleTab === 'chat' && (
            <AIChatAssistant
              incidents={incidents}
              vehicles={vehicles}
              shelters={shelters}
              hospitals={hospitals}
              warehouses={warehouses}
              roadClosures={roadClosures}
            />
          )}

          {activeConsoleTab === 'analytics' && (
            <AnalyticsDashboard
              incidents={incidents}
              vehicles={vehicles}
            />
          )}

          {activeConsoleTab === 'reports' && (
            <ReportGenerator
              incidents={incidents}
              vehicles={vehicles}
              shelters={shelters}
              hospitals={hospitals}
            />
          )}
        </ResizablePanel>

        {/* ==========================================
            FLOATING BOTTOM TIMELINE/FEED TICKER
            ========================================== */}
        <footer className={`absolute bottom-5 right-5 z-[1000] h-14 glass-panel-floating rounded-2xl flex items-center px-4 overflow-hidden select-none pointer-events-auto transition-all duration-300 ${
          sidebarExpanded ? 'left-68' : 'left-24'
        }`}>
          <div className="flex items-center gap-2 flex-shrink-0 font-bold text-cyan-400 text-[8px] uppercase tracking-wider border-r border-white/10 pr-3.5 mr-3">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
            <span>COMMAND LOGS</span>
          </div>

          {/* Scrolling ticker content */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="fade-mask-left"></div>
            <div className="fade-mask-right"></div>
            
            <div className="marquee-wrapper">
              <div className="marquee-track">
                {notifications.length === 0 ? (
                  <span className="text-zinc-500 italic">SYSTEM IDLE: Awaiting TSDMA incident signals...</span>
                ) : (
                  notifications.slice(-6).reverse().map((notif, index) => {
                    let dotColor = 'bg-cyan-400';
                    let typeColor = 'text-cyan-400';
                    if (notif.type === 'emergency') {
                      dotColor = 'bg-red-500 animate-pulse';
                      typeColor = 'text-red-400 font-bold';
                    } else if (notif.type === 'warning') {
                      dotColor = 'bg-amber-500';
                      typeColor = 'text-amber-400';
                    } else if (notif.type === 'success') {
                      dotColor = 'bg-emerald-500';
                      typeColor = 'text-emerald-400';
                    }
                    return (
                      <div key={`${notif.id}-${index}`} className="flex items-center space-x-2 mr-6 flex-shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                        <span className={`${typeColor} font-bold uppercase`}>[{notif.type}]:</span>
                        <span className="text-zinc-200">{notif.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <style jsx>{`
              .fade-mask-left {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 32px;
                background: linear-gradient(to right, rgba(9, 9, 11, 0.95), transparent);
                z-index: 10;
                pointer-events: none;
              }
              .fade-mask-right {
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 32px;
                background: linear-gradient(to left, rgba(9, 9, 11, 0.95), transparent);
                z-index: 10;
                pointer-events: none;
              }
              .marquee-wrapper {
                width: 100%;
                overflow: hidden;
                position: relative;
                display: flex;
                align-items: center;
              }
              .marquee-track {
                display: flex;
                white-space: nowrap;
                gap: 2rem;
                animation: scroll-logs 35s linear infinite;
              }
              .marquee-track:hover {
                animation-play-state: paused;
              }
              @keyframes scroll-logs {
                0% { transform: translate3d(5%, 0, 0); }
                100% { transform: translate3d(-100%, 0, 0); }
              }
            `}</style>
          </div>

          <button
            onClick={clearNotifications}
            className="text-zinc-500 hover:text-white transition text-[8px] uppercase ml-3 border border-white/5 hover:border-zinc-700 px-2 py-1 rounded-lg flex-shrink-0"
          >
            Clear logs
          </button>
        </footer>

        <LogoutConfirm
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={() => {
            setIsLogoutModalOpen(false);
            auth.logout();
          }}
        />
      </div>
    </div>
  );
}

export default function HomePortal() {
  return (
    <AuthProvider>
      <HomePortalContent />
    </AuthProvider>
  );
}

function HomePortalContent() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <span className="text-[9px] text-cyan-500 uppercase tracking-widest animate-pulse">
          Establishing EOC Secure Handshake...
        </span>
      </div>
    );
  }

  return <HomeDashboard />;
}
