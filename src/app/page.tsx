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
  Loader2,
  Sun,
  Moon,
  Shield,
  ArrowRight,
  ArrowDown,
  Database
} from 'lucide-react';
import { AuthProvider, useAuth, UserRole } from '../context/AuthContext';
import Login from '../components/Login';
import LogoutConfirm from '../components/LogoutConfirm';
import { useSimulation } from '../hooks/useSimulation';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Incident, Vehicle, Warehouse, Shelter, Hospital, Location } from '../utils/mockData';
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
import SavedLocationsArchive from '../components/SavedLocationsArchive';
import ResizablePanel from '../components/ResizablePanel';
import { FAQ } from '../components/ui/faq-section';

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
export function HomeDashboard({ isDemoMode = false, initialView }: { isDemoMode?: boolean; initialView?: 'landing' | 'admin' | 'citizen' }) {
  const auth = useAuth();
  const [currentView, setViewInternal] = useState<'landing' | 'admin' | 'citizen'>(() => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/citizen')) return 'citizen';
      const param = new URLSearchParams(window.location.search).get('view');
      if (param === 'admin') return 'admin';
      if (param === 'citizen') return 'citizen';
      const saved = sessionStorage.getItem('resqai_active_pathway');
      if (saved === 'admin' || saved === 'citizen') return saved;
    }
    return 'landing';
  });

  const setCurrentView = useCallback((view: 'landing' | 'admin' | 'citizen') => {
    setViewInternal(view);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('resqai_active_pathway', view);
        const newPath = view === 'admin' ? '/admin' : view === 'citizen' ? '/citizen' : '/';
        if (window.location.pathname !== newPath) {
          window.history.pushState({ view }, '', newPath);
        }
      } catch (e) {}
    }
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) setViewInternal('admin');
      else if (path.startsWith('/citizen')) setViewInternal('citizen');
      else setViewInternal('landing');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [pipelineVisible, setPipelineVisible] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0.0); // actual animated value
  const targetStepRef = useRef(0.0); // target goal value
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Lerp loop for buttery-smooth pipeline progression
  useEffect(() => {
    let animationFrameId: number;
    
    const updateLerp = () => {
      setPipelineStep(prev => {
        const diff = targetStepRef.current - prev;
        if (Math.abs(diff) < 0.001) {
          return targetStepRef.current;
        }
        // Lerp step: move 8% closer to the target value on each frame
        return prev + diff * 0.08;
      });
      animationFrameId = requestAnimationFrame(updateLerp);
    };
    
    animationFrameId = requestAnimationFrame(updateLerp);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Intersection Observer to set visible state when the section enters the screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPipelineVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    const el = pipelineRef.current;
    if (el) {
      observer.observe(el);
    }

    const handleScroll = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress of section through the viewport center.
      // Starts when element top is at 75% of screen height and ends when bottom is at 25%.
      const elementHeight = rect.height;
      const elementTop = rect.top;
      
      const startOffset = windowHeight * 0.75;
      const endOffset = windowHeight * 0.25;
      
      const totalRange = startOffset - endOffset + elementHeight * 0.4;
      const currentScroll = startOffset - elementTop;
      
      let progress = currentScroll / totalRange;
      progress = Math.max(0, Math.min(1, progress));
      
      targetStepRef.current = progress * 6.0;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (el) {
        observer.unobserve(el);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);
  const [eocTime, setEocTime] = useState('');
  const [eocDate, setEocDate] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userLiveLocation, setUserLiveLocation] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('resqai_exact_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.lat && parsed.lng) {
            return { lat: parsed.lat, lng: parsed.lng };
          }
        }
      } catch (e) {}
    }
    return { lat: 17.47218, lng: 78.42259 };
  });
  const handleUserLiveLocationLock = useCallback((loc: { lat: number; lng: number } | null) => {
    if (!loc) return;
    setUserLiveLocation(prev => {
      if (prev && Math.abs(prev.lat - loc.lat) < 0.00001 && Math.abs(prev.lng - loc.lng) < 0.00001) {
        return prev;
      }
      return loc;
    });
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

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
    setVehicles,
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
    updateIncident,
    clearNotifications,
    toggleRoadClosure,
    addNotification,
    refreshIncidents,
  } = useSimulation();

  const handleAddIncident = useCallback((incident: Omit<Incident, 'id' | 'reportedAt' | 'status'> & { status?: Incident['status'] }) => {
    return addIncident(incident);
  }, [addIncident]);

  const handleDispatchVehicle = useCallback((vehicleId: string, incidentId: string) => {
    dispatchVehicle(vehicleId, incidentId);
  }, [dispatchVehicle]);

  const handleToggleRoadClosure = useCallback((location: { lat: number; lng: number }) => {
    toggleRoadClosure(location);
  }, [toggleRoadClosure]);

  const handleToggleAutopilot = useCallback(() => {
    setAutopilotEnabled(!autopilotEnabled);
  }, [autopilotEnabled, setAutopilotEnabled]);

  const [activeConsoleTab, setActiveConsoleTab] = useState<'dispatch' | 'archive' | 'analyzer' | 'sos' | 'risk' | 'chat' | 'analytics' | 'reports'>('dispatch');
  const [sosConsoleRightTab, setSosConsoleRightTab] = useState<'inspect' | 'manual'>('inspect');
  const [forecastHours, setForecastHours] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Deep linking URL query parameters listener (?incident=<id> or ?view=citizen|admin)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('incident');
      const view = params.get('view');

      if (view === 'citizen') {
        setCurrentView('citizen');
      } else if (view === 'admin') {
        setCurrentView('admin');
      }

      if (targetId && incidents.length > 0) {
        const found = incidents.find((i) => i.id === targetId);
        if (found) {
          setSelectedIncident(found);
          addNotification(`TELEMETRY DIRECT LINK: Loaded coordinates for ${found.type} (${found.id}).`, 'info');
        }
      }
    } catch (err) {
      console.error('Deep link query param error:', err);
    }
  }, [incidents, addNotification]);

  const filteredIncidents = useMemo(() => {
    if (selectedCategory === 'All') return incidents;
    if (selectedCategory === '⭐ Citizen Reports') {
      return incidents.filter(inc => inc.isUserReported || inc.starred);
    }
    if (selectedCategory === 'Disasters') {
      return incidents.filter(inc => inc.type !== 'POLICE_SOS');
    }
    if (selectedCategory === 'Police SOS') {
      return incidents.filter(inc => inc.type === 'POLICE_SOS');
    }
    return incidents.filter(inc => inc.category === selectedCategory);
  }, [incidents, selectedCategory]);

  // Hardware panic shortcut listener (Volume Up key triple press)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHardwarePanic = () => {
      // Find current user coordinates (or use Gachibowli as fallback)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          triggerPanicSOS(location);
        },
        () => {
          // Fallback to Hyderabad Gachibowli center
          const location = { lat: 17.4483, lng: 78.3741 };
          triggerPanicSOS(location);
        }
      );
    };

    const triggerPanicSOS = (location: { lat: number; lng: number }) => {
      const newInc = handleAddIncident({
        type: 'POLICE_SOS',
        category: 'Public Safety',
        severity: 95,
        location,
        description: '🚨 HARDWARE PANIC ALARM: Emergency SOS triggered via hardware volume-key shortcut!',
        casualtyEstimate: 1,
        trappedCount: 0,
        requiredResources: ['Police Patrol', 'Paramedics'],
        reporter: 'Citizen SOS',
        aiPriority: 'CRITICAL',
        etaResolution: 1.0,
        needsSOSValidation: false
      });
      
      addNotification('⚠️ PANIC SHORTCUT ACTIVATED: Creating critical SOS ticket and notifying EOC!', 'emergency');
      setCurrentView('citizen'); // Redirect user to citizen portal to show tracking
      
      // Auto-center map or select incident if possible
      if (newInc) {
        setSelectedIncident(newInc);
      }
    };

    window.addEventListener('volumeUpPanicTriggered', handleHardwarePanic);
    return () => {
      window.removeEventListener('volumeUpPanicTriggered', handleHardwarePanic);
    };
  }, [handleAddIncident, addNotification, setSelectedIncident]);
  
  const handleUpdateIncident = useCallback((updated: Incident) => {
    updateIncident(updated);
    setSelectedIncident(updated);

    if (updated.type === 'POLICE_SOS') {
      if (updated.status === 'Police Responding') {
        if (updated.assignedVehicleId) {
          dispatchVehicle(updated.assignedVehicleId, updated.id);
        }
      } else if (updated.status === 'Resolved') {
        if (updated.assignedVehicleId) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === updated.assignedVehicleId
                ? {
                    ...v,
                    status: 'Idle' as const,
                    activeIncidentId: null,
                    speed: 0,
                    path: [],
                    pathIndex: 0,
                    etaMinutes: null,
                    missionDescription: null
                  }
                : v
            )
          );

          if (isSupabaseConfigured && supabase) {
            supabase!.from('vehicles').update({
              status: 'Idle',
              activeIncidentId: null,
              speed: 0,
              path: [],
              pathIndex: 0,
              etaMinutes: null,
              missionDescription: null
            }).eq('id', updated.assignedVehicleId).then();
          }
        }
      }
    }
  }, [setIncidents, dispatchVehicle, setVehicles, isSupabaseConfigured, auth.user, addNotification]);
  
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
      handleToggleAutopilot();
      addNotification('[AI COMMAND] Autopilot state toggled via command line.', 'info');
    } else if (trimmed === '/clear') {
      clearNotifications();
      addNotification('[AI COMMAND] Announcements cleared.', 'info');
    } else if (trimmed.startsWith('/sos ')) {
      const type = cmd.substring(5).trim();
      const mappedType = (type.charAt(0).toUpperCase() + type.slice(1)) as Incident['type'];
      handleAddIncident({
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
    { id: 'archive', label: 'Saved Locations Archive', icon: Database },
    { id: 'analyzer', label: 'AI Intel Analyzer', icon: Radio },
    { id: 'sos', label: 'Citizen SOS Feed', icon: Activity },
    { id: 'risk', label: 'Risk Projections', icon: TrendingUp },
    { id: 'chat', label: 'Chat Advisor', icon: Bot },
    { id: 'analytics', label: 'Analytics Graphs', icon: FileText },
    { id: 'reports', label: 'Report Briefings', icon: Briefcase }
  ];

  // Pipeline animations status helpers
  const getStepStatus = (index: number) => {
    // index is 0 to 6
    const current = pipelineStep >= index && pipelineStep < index + 1;
    const isLastActive = index === 6 && pipelineStep >= 6.0;
    
    const completed = pipelineStep >= index + 1;
    const pending = pipelineStep < index;
    
    return { 
      current: current || isLastActive, 
      completed, 
      pending 
    };
  };

  const getArrowFill = (index: number) => {
    // index is 0 to 5 (Arrow 1 to 6)
    const progress = pipelineStep - index;
    const fillPercent = Math.max(0, Math.min(100, progress * 100));
    return fillPercent;
  };

  const getStepColors = (index: number) => {
    switch (index) {
      case 0: // Citizen SOS
        return {
          border: 'border-red-500/70',
          bg: 'bg-red-950/20',
          iconBg: 'bg-red-500/20 text-red-300',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.35)]',
          bullet: 'text-red-400'
        };
      case 1: // AI Vetting
        return {
          border: 'border-purple-500/70',
          bg: 'bg-purple-950/20',
          iconBg: 'bg-purple-500/20 text-purple-300',
          glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
          bullet: 'text-purple-400'
        };
      case 2: // Location Lock
        return {
          border: 'border-amber-500/70',
          bg: 'bg-amber-950/20',
          iconBg: 'bg-amber-500/20 text-amber-300',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
          bullet: 'text-amber-400'
        };
      case 3: // Priority Queue
        return {
          border: 'border-blue-500/70',
          bg: 'bg-blue-950/20',
          iconBg: 'bg-blue-500/20 text-blue-300',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.35)]',
          bullet: 'text-blue-400'
        };
      case 4: // Auto Dispatch
        return {
          border: 'border-orange-500/70',
          bg: 'bg-orange-950/20',
          iconBg: 'bg-orange-500/20 text-orange-300',
          glow: 'shadow-[0_0_20px_rgba(249,115,22,0.35)]',
          bullet: 'text-orange-400'
        };
      case 5: // EOC Oversight
        return {
          border: 'border-cyan-500/70',
          bg: 'bg-cyan-950/20',
          iconBg: 'bg-cyan-500/20 text-cyan-300',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
          bullet: 'text-cyan-400'
        };
      case 6: // Resolution
        return {
          border: 'border-emerald-500/70',
          bg: 'bg-emerald-950/20',
          iconBg: 'bg-emerald-500/20 text-emerald-300',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
          bullet: 'text-emerald-400'
        };
      default:
        return {
          border: 'border-cyan-500/70',
          bg: 'bg-cyan-950/20',
          iconBg: 'bg-cyan-500/20 text-cyan-300',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
          bullet: 'text-cyan-400'
        };
    }
  };

  const getConnectorColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]';
      case 1:
        return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]';
      case 2:
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]';
      case 3:
        return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]';
      case 4:
        return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]';
      case 5:
        return 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.7)]';
      default:
        return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]';
    }
  };

  const renderStepCard = (index: number, num: string, icon: string, title: string, desc: string) => {
    const { current, completed } = getStepStatus(index);
    const colors = getStepColors(index);
    
    return (
      <div 
        className={`glass-panel p-4 rounded-xl relative border flex flex-col justify-between items-center space-y-2 transition-all duration-500 ${
          current 
            ? `scale-[1.05] ${colors.border} ${colors.bg} text-white ${colors.glow} z-10 opacity-100` 
            : completed 
            ? 'scale-100 border-emerald-500/30 bg-emerald-950/5 opacity-[0.65] text-zinc-300'
            : 'scale-100 border-white/10 bg-zinc-950/30 opacity-[0.45] text-zinc-400'
        }`}
      >
        <div className="w-full flex justify-between items-center text-[8px] font-bold text-zinc-550">
          <span>{num}</span>
          {completed && <span className="text-emerald-400 font-bold text-[9px]">✓</span>}
          {current && <span className={`${colors.bullet} font-bold text-[9px] animate-pulse`}>●</span>}
        </div>
        <span className={`p-1.5 rounded-lg text-xs transition-all duration-300 ${
          current 
            ? `${colors.iconBg} scale-110 shadow-lg` 
            : completed 
            ? 'bg-emerald-500/10 text-emerald-400' 
            : 'bg-zinc-800/40 text-zinc-500'
        }`}>
          {icon}
        </span>
        <div className={`font-bold uppercase text-[10px] transition-colors duration-300 ${
          current ? 'text-white font-extrabold' : completed ? 'text-zinc-300' : 'text-zinc-450'
        }`}>
          {title}
        </div>
        <div className={`text-[8px] leading-relaxed transition-colors duration-300 ${
          current ? 'text-zinc-200' : completed ? 'text-zinc-550' : 'text-zinc-600'
        }`}>
          {desc}
        </div>
      </div>
    );
  };

  const renderConnector = (index: number) => {
    const fill = getArrowFill(index);
    const connectorColor = getConnectorColor(index);
    return (
      <>
        <div className={`hidden md:flex flex-col items-center justify-center relative w-full px-1 transition-all duration-300 ${fill > 0 ? 'opacity-100' : 'opacity-40'}`}>
          <div className="w-full h-[2px] bg-zinc-800/60 relative rounded-full overflow-hidden">
            <div 
              className={`absolute top-0 bottom-0 left-0 transition-all duration-75 ${connectorColor}`}
              style={{ width: `${fill}%` }}
            />
          </div>
          {fill > 0 && fill < 100 && (
            <div 
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#06b6d4] -translate-x-1/2 transition-all duration-75 top-[19px]"
              style={{ left: `calc(${fill}% + 4px)` }}
            />
          )}
          <ArrowRight className={`w-3 h-3 mt-1.5 transition-colors duration-300 ${fill === 100 ? 'text-cyan-400' : 'text-zinc-700'}`} />
        </div>
        <div className={`flex md:hidden flex-col items-center justify-center relative py-1 h-8 transition-all duration-300 ${fill > 0 ? 'opacity-100' : 'opacity-45'}`}>
          <div className="h-full w-[2px] bg-zinc-800/60 relative rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 right-0 top-0 transition-all duration-75 ${connectorColor}`}
              style={{ height: `${fill}%` }}
            />
          </div>
          {fill > 0 && fill < 100 && (
            <div 
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#06b6d4] -translate-y-1/2 transition-all duration-75 left-[15px]"
              style={{ top: `calc(${fill}% + 4px)` }}
            />
          )}
          <ArrowDown className={`w-3 h-3 mt-1 transition-colors duration-300 ${fill === 100 ? 'text-cyan-400' : 'text-zinc-700'}`} />
        </div>
      </>
    );
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500 selection:text-black font-sans relative overflow-x-hidden">
        {isDemoMode && (
          <div className="bg-amber-950/95 backdrop-blur border-b border-amber-500/30 text-amber-400 font-mono text-[9px] py-1.5 px-6 text-center uppercase tracking-widest relative z-50 flex items-center justify-center gap-2 select-none">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
            <span>Evaluation Demo Mode Active — Simulated telemetry grid database</span>
          </div>
        )}
        {/* Navigation */}
        <nav className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black font-mono text-sm tracking-tighter flex-shrink-0">
                RQ
              </div>
              <span className="font-bold tracking-wider text-xs sm:text-sm font-mono uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent whitespace-nowrap">
                <span className="hidden sm:inline">TSDMA ResQAI</span>
                <span className="inline sm:hidden">ResQAI</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer flex-shrink-0"
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
              </button>
              <button
                onClick={() => {
                  setCurrentView('citizen');
                  addNotification('SOS CHANNEL INITIATED: Redirecting to emergency console.', 'info');
                }}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-red-950/40 border border-red-500/50 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 cursor-pointer animate-pulse flex-shrink-0"
              >
                <span>🚨</span>
                <span className="hidden sm:inline">SOS ASSISTANCE</span>
              </button>
              <button
                onClick={() => setCurrentView('citizen')}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 transition text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 flex-shrink-0"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Citizen Portal</span>
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-600 text-black hover:bg-cyan-500 transition text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 flex-shrink-0"
              >
                <span>🛡️</span>
                <span className="hidden sm:inline">EOC Admin</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-white/5">
          {/* Background Video (Hero Only) */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover z-0 pointer-events-none opacity-20 transition-opacity duration-500"
          >
            <source src="/background.mov" type="video/quicktime" />
            <source src="/background.mov" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent opacity-70 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8 py-16">
            <div className="inline-flex items-center space-x-2 bg-red-950/30 border border-red-500/30 px-3.5 py-1 rounded-full text-[10px] text-red-400 font-mono tracking-widest uppercase animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              <span>ResQAI Active Operations Command</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-wider font-mono text-white leading-none uppercase">
                ResQAI
              </h1>
              <h2 className="text-lg md:text-2xl font-bold tracking-widest text-cyan-400 font-mono uppercase">
                AI-Powered Emergency Response
              </h2>
            </div>
            
            <p className="text-xs md:text-sm text-zinc-400 max-w-3xl mx-auto font-mono leading-relaxed">
              Detect emergencies. Locate people. Prioritize incidents. Coordinate responders — in real time. 
              ResQAI connects citizens, AI intelligence, field responders, and the Emergency Operations Center (EOC) into one seamless emergency response system.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <button
                onClick={() => {
                  setCurrentView('citizen');
                  addNotification('SOS CHANNEL INITIATED: Redirecting to emergency console.', 'info');
                }}
                className="relative group w-full sm:w-auto block text-xs font-bold font-mono uppercase tracking-widest outline-none cursor-pointer select-none"
              >
                {/* Red Offset Shadow Layer */}
                <div className="absolute inset-0 bg-red-950 border border-red-500/40 transition-all duration-300 translate-x-0 translate-y-0 md:group-hover:-translate-x-2.5 md:group-hover:translate-y-2.5 z-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]" />
                
                {/* Red Foreground Box */}
                <div className="relative z-10 w-full px-8 py-3.5 bg-gradient-to-r from-red-600 to-amber-600 border border-red-500 text-black flex items-center justify-between gap-4 transition-transform duration-300 md:group-hover:-translate-y-0.5 rounded-none font-extrabold">
                  <span>🚨 SOS / REPORT EMERGENCY</span>
                  <span className="text-black font-extrabold">→</span>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('admin')}
                className="relative group w-full sm:w-auto block text-xs font-bold font-mono uppercase tracking-widest outline-none cursor-pointer select-none"
              >
                {/* Cyan Offset Shadow Layer */}
                <div className="absolute inset-0 bg-cyan-950 border border-cyan-500/30 transition-all duration-300 translate-x-0 translate-y-0 md:group-hover:-translate-x-2.5 md:group-hover:translate-y-2.5 z-0" />
                
                {/* Glass Foreground Box */}
                <div className="relative z-10 w-full px-8 py-3.5 bg-zinc-900/90 border border-zinc-700 hover:border-cyan-500/50 text-cyan-400 hover:text-white flex items-center justify-between gap-4 transition-transform duration-300 md:group-hover:-translate-y-0.5 rounded-none">
                  <span>📡 VIEW LIVE OPERATIONS</span>
                  <span className="text-cyan-400 transition-colors duration-300 group-hover:text-white font-bold">→</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Live Status Ticker */}
        <section className="bg-zinc-950 border-y border-white/5 py-3 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-emerald-400 font-bold">LIVE PLATFORM TELEMETRY</span>
            </div>
            <div className="flex gap-x-6 animate-pulse truncate">
              <span>Hyderabad: ACTIVE</span>
              <span>Khammam Depot: SECURE</span>
              <span>Warangal HQ: MONITORING</span>
              <span>Landslide Risk Forecast: CALCULATED</span>
            </div>
            <div className="hidden md:block text-[8px] text-cyan-500/80">
              DEMO DATA SIMULATION
            </div>
          </div>
        </section>

        {/* Section: The Response Pipeline */}
        <section ref={pipelineRef} className="max-w-7xl mx-auto px-6 py-20 border-b border-white/5 space-y-12 overflow-hidden w-full">
              <div className="text-center space-y-2.5">
                <span className={`text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block transition-all duration-700 transform ${
                  pipelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}>
                  Closed-Loop Coordination
                </span>
                <h2 className={`text-2xl md:text-3xl font-extrabold tracking-wider font-mono uppercase text-white transition-all duration-700 delay-100 transform ${
                  pipelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}>
                  The ResQAI Emergency Pipeline
                </h2>
                <p className={`text-[11px] text-zinc-500 font-mono max-w-xl mx-auto transition-all duration-700 delay-200 transform ${
                  pipelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}>
                  How data and actions flow through the system to guarantee optimized response when every second matters.
                </p>
              </div>

              {/* Animated Pipeline Grid */}
              <div className={`grid grid-cols-1 md:grid-cols-7 gap-3 text-center relative font-mono text-[9px] transition-all duration-700 delay-300 transform ${
                pipelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                {renderStepCard(0, '01', '🚨', 'Citizen SOS', 'SOS triggered or incident reported.')}
                {renderConnector(0)}
                {renderStepCard(1, '02', '🤖', 'AI Vetting', 'Gemini vision checks authenticity.')}
                {renderConnector(1)}
                {renderStepCard(2, '03', '📍', 'Location Lock', 'Telemetry coordinates mapped.')}
                {renderConnector(2)}
                {renderStepCard(3, '04', '⚖️', 'Priority Queue', 'Emergency queued based on severity.')}
                {renderConnector(3)}
                {renderStepCard(4, '05', '🚒', 'Auto Dispatch', 'Nearest fleet responder assigned.')}
                {renderConnector(4)}
                {renderStepCard(5, '06', '🛡️', 'EOC Oversight', 'Live telemetry tracking in EOC.')}
                {renderConnector(5)}
                {renderStepCard(6, '07', '✓', 'Resolution', 'Responder arrives & incident resolved.')}
              </div>
            </section>



        {/* Section: Platform Architecture & Roles */}
        <section className="max-w-7xl mx-auto px-6 py-20 space-y-12">
          <div className="text-center space-y-2.5">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Platform Stakeholders</span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-wider font-mono uppercase text-white">
              Connective Platform Roles
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono max-w-xl mx-auto">
              Connecting citizens, AI intelligence, responders, and EOC command command structures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
            {/* Stakeholder 1 */}
            <div className="group glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-72 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:bg-zinc-900/40 hover:border-red-500/30 hover:shadow-[0_10px_30px_rgba(239,68,68,0.15)]">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-400 transition-all duration-300 group-hover:bg-red-500/20 group-hover:text-red-300 group-hover:border-red-500/40 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white uppercase text-[11px] transition-colors duration-300 group-hover:text-red-400">01 — CITIZEN PORTAL</h3>
                <p className="text-zinc-400 text-[9.5px] leading-relaxed transition-colors duration-300 group-hover:text-zinc-300">
                  Trigger urgent one-click SOS broadcasts, report disaster situations with photo uploads, and track assigned responder telemetry in real-time.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('citizen')}
                className="w-full text-center py-2 bg-red-950/30 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase rounded-lg transition-all duration-300 group-hover:bg-red-500/20 group-hover:border-red-500/50 group-hover:text-white cursor-pointer hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]"
              >
                Access SOS Portal
              </button>
            </div>

            {/* Stakeholder 2 */}
            <div className="group glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-72 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:bg-zinc-900/40 hover:border-purple-500/30 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)]">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-center text-purple-400 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:text-purple-300 group-hover:border-purple-500/40 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white uppercase text-[11px] transition-colors duration-300 group-hover:text-purple-400">02 — AI DISPATCH ENGINE</h3>
                <p className="text-zinc-400 text-[9.5px] leading-relaxed transition-colors duration-300 group-hover:text-zinc-300">
                  Analyze reports using Gemini Vision AI model checking, auto-compute incident severity levels, and route the closest patrol units.
                </p>
              </div>
              <span className="w-full text-center py-2 bg-purple-950/15 border border-purple-500/20 text-purple-400 text-[9px] font-bold uppercase rounded-lg block select-none transition-all duration-300 group-hover:bg-purple-500/10 group-hover:border-purple-500/40 group-hover:text-purple-300">
                AI Pipeline Engine
              </span>
            </div>

            {/* Stakeholder 3 */}
            <div className="group glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-72 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:bg-zinc-900/40 hover:border-blue-500/30 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)]">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-center justify-center text-blue-400 transition-all duration-300 group-hover:bg-blue-500/20 group-hover:text-blue-300 group-hover:border-blue-500/40 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white uppercase text-[11px] transition-colors duration-300 group-hover:text-blue-400">03 — EMERGENCY RESPONDERS</h3>
                <p className="text-zinc-400 text-[9.5px] leading-relaxed transition-colors duration-300 group-hover:text-zinc-300">
                  Emergency cruisers, medical squads, and fire teams receive active navigation nodes, telemetry directions, and update response states.
                </p>
              </div>
              <span className="w-full text-center py-2 bg-blue-950/15 border border-blue-500/20 text-blue-400 text-[9px] font-bold uppercase rounded-lg block select-none transition-all duration-300 group-hover:bg-blue-500/10 group-hover:border-blue-500/40 group-hover:text-blue-300">
                Field Fleets
              </span>
            </div>

            {/* Stakeholder 4 */}
            <div className="group glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-72 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:bg-zinc-900/40 hover:border-cyan-500/30 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)]">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 transition-all duration-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white uppercase text-[11px] transition-colors duration-300 group-hover:text-cyan-400">04 — EOC COMMAND HUB</h3>
                <p className="text-zinc-400 text-[9.5px] leading-relaxed transition-colors duration-300 group-hover:text-zinc-300">
                  Synchronize municipal resource databases, monitor active incident matrices, override dispatch settings, and coordinate the state disaster grids.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('admin')}
                className="w-full text-center py-2 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-[9px] font-bold uppercase rounded-lg transition-all duration-300 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 group-hover:text-white cursor-pointer hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              >
                Access Command Dashboard
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <FAQ />

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 text-center text-zinc-400 text-xs font-mono">
          <p>© 2026 Telangana State Disaster Management Authority (TSDMA). Operational Grade AI System.</p>
        </footer>
      </div>
    );
  }

  if (currentView === 'citizen') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500 selection:text-black font-sans flex flex-col">
        {isDemoMode && (
          <div className="bg-amber-950/95 backdrop-blur border-b border-amber-500/30 text-amber-400 font-mono text-[9px] py-1.5 px-6 text-center uppercase tracking-widest sticky top-0 z-[100] flex items-center justify-center gap-2 select-none flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
            <span>Evaluation Demo Mode Active — Simulated telemetry grid database</span>
          </div>
        )}
        {/* Navigation */}
        <nav className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-black font-mono text-sm tracking-tighter flex-shrink-0">
                RQ
              </div>
              <span className="font-bold tracking-wider text-xs sm:text-sm font-mono uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent whitespace-nowrap">
                <span className="hidden sm:inline">TSDMA Citizen Safety Portal</span>
                <span className="inline sm:hidden">ResQAI Citizen</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
              <span className="hidden md:inline px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-widest animate-pulse whitespace-nowrap">
                Live Public Channel
              </span>
              <span className="inline md:hidden w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse flex-shrink-0" title="Live Public Channel"></span>
              
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer flex-shrink-0"
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
              </button>
              <button
                onClick={() => setCurrentView('landing')}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-cyan-500/50 text-zinc-200 hover:text-white transition text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-sm active:scale-95"
                title="Return to the Main Home Portal"
              >
                <span className="text-xs sm:text-sm">🏠</span>
                <span>Go Back Home</span>
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-600 text-black hover:bg-cyan-500 transition text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
              >
                <span>🛡️</span>
                <span className="hidden sm:inline">Admin Panel</span>
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
                  const newInc = handleAddIncident({
                    ...inc,
                    reporter: 'Citizen Portal'
                  });
                  if (newInc) {
                    setSelectedIncident(newInc);
                  }
                }}
                addNotification={addNotification}
                onUpdateIncident={handleUpdateIncident}
                onLocationLock={handleUserLiveLocationLock}
                overrideLocation={userLiveLocation}
              />
            </div>

            {/* Public Staging Shelters Directory */}
            <div className="premium-card p-5 rounded-2xl flex-1 space-y-4">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono border-b border-white/5 pb-2">
                <Compass className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Voluntary Relief Shelters</span>
              </div>
              <div className="space-y-4 font-mono text-[11px] max-h-48 overflow-y-auto pr-1 pb-1">
                {shelters.map((sh) => (
                  <div 
                    key={sh.id} 
                    className="relative group/shelter w-full block text-left outline-none select-none animate-fade-in"
                  >
                    {/* Black Offset Layer */}
                    <div className="absolute inset-0 bg-black border border-black transition-all duration-300 translate-x-0 translate-y-0 md:group-hover/shelter:-translate-x-1.5 md:group-hover/shelter:translate-y-1.5 z-0" />
                    
                    {/* White Foreground Box */}
                    <div className="relative z-10 w-full p-2.5 bg-white border border-black text-black flex justify-between items-start transition-transform duration-300 md:group-hover/shelter:-translate-y-0.5 rounded-none">
                      <div>
                        <div className="font-bold uppercase text-[10px] leading-tight transition-colors duration-300">{sh.name}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">Status: Operational</div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-700 font-extrabold text-[10px] transition-colors duration-300 group-hover/shelter:text-red-600">{sh.capacity - sh.occupied} / {sh.capacity} Vacant</span>
                        <p className="text-[8px] text-zinc-500 mt-0.5">Evacuees Staged</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Helpline Directory */}
            <div className="premium-card p-5 rounded-2xl flex-shrink-0 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-3 border-b border-white/5 pb-1">Emergency Directory</span>
              <div className="grid grid-cols-2 gap-3 text-[10px] pb-1">
                <div 
                  onClick={() => window.open('tel:1070')}
                  className="relative group/helpline block text-left outline-none cursor-pointer select-none"
                >
                  {/* Black Offset Layer */}
                  <div className="absolute inset-0 bg-black border border-black transition-all duration-300 translate-x-0 translate-y-0 md:group-hover/helpline:-translate-x-1.5 md:group-hover/helpline:translate-y-1.5 z-0" />
                  
                  {/* White Foreground Box */}
                  <div className="relative z-10 w-full p-2.5 bg-white border border-black text-black flex flex-col transition-transform duration-300 md:group-hover/helpline:-translate-y-0.5 rounded-none">
                    <div className="text-zinc-500 uppercase text-[8px] font-bold">National Helpline</div>
                    <div className="font-extrabold text-black mt-0.5 text-xs flex justify-between items-center">
                      <span>1070</span>
                      <span className="text-black transition-colors duration-300 group-hover/helpline:text-red-600 text-[10px]">📞</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => window.open('tel:108')}
                  className="relative group/ambulance block text-left outline-none cursor-pointer select-none"
                >
                  {/* Black Offset Layer */}
                  <div className="absolute inset-0 bg-black border border-black transition-all duration-300 translate-x-0 translate-y-0 md:group-hover/ambulance:-translate-x-1.5 md:group-hover/ambulance:translate-y-1.5 z-0" />
                  
                  {/* White Foreground Box */}
                  <div className="relative z-10 w-full p-2.5 bg-white border border-black text-black flex flex-col transition-transform duration-300 md:group-hover/ambulance:-translate-y-0.5 rounded-none">
                    <div className="text-zinc-500 uppercase text-[8px] font-bold">Ambulance Services</div>
                    <div className="font-extrabold text-black mt-0.5 text-xs flex justify-between items-center">
                      <span>108</span>
                      <span className="text-black transition-colors duration-300 group-hover/ambulance:text-red-600 text-[10px]">📞</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => window.open('tel:101')}
                  className="relative group/fire block text-left outline-none cursor-pointer select-none"
                >
                  {/* Black Offset Layer */}
                  <div className="absolute inset-0 bg-black border border-black transition-all duration-300 translate-x-0 translate-y-0 md:group-hover/fire:-translate-x-1.5 md:group-hover/fire:translate-y-1.5 z-0" />
                  
                  {/* White Foreground Box */}
                  <div className="relative z-10 w-full p-2.5 bg-white border border-black text-black flex flex-col transition-transform duration-300 md:group-hover/fire:-translate-y-0.5 rounded-none">
                    <div className="text-zinc-500 uppercase text-[8px] font-bold">Fire Control</div>
                    <div className="font-extrabold text-black mt-0.5 text-xs flex justify-between items-center">
                      <span>101</span>
                      <span className="text-black transition-colors duration-300 group-hover/fire:text-red-600 text-[10px]">📞</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => window.open('tel:100')}
                  className="relative group/police block text-left outline-none cursor-pointer select-none"
                >
                  {/* Black Offset Layer */}
                  <div className="absolute inset-0 bg-black border border-black transition-all duration-300 translate-x-0 translate-y-0 md:group-hover/police:-translate-x-1.5 md:group-hover/police:translate-y-1.5 z-0" />
                  
                  {/* White Foreground Box */}
                  <div className="relative z-10 w-full p-2.5 bg-white border border-black text-black flex flex-col transition-transform duration-300 md:group-hover/police:-translate-y-0.5 rounded-none">
                    <div className="text-zinc-500 uppercase text-[8px] font-bold">Police Desk</div>
                    <div className="font-extrabold text-black mt-0.5 text-xs flex justify-between items-center">
                      <span>100</span>
                      <span className="text-black transition-colors duration-300 group-hover/police:text-red-600 text-[10px]">📞</span>
                    </div>
                  </div>
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
                  hideUserLocationMarker={true}
                  onMapClick={(loc) => {
                    setUserLiveLocation(loc);
                    addNotification(`Disaster coordinates pinned at ${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E`, 'info');
                  }}
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-950 text-white font-mono selection:bg-cyan-500 selection:text-black">
      {isDemoMode && (
        <div className="bg-amber-950/95 backdrop-blur border-b border-amber-500/30 text-amber-400 font-mono text-[9px] py-1.5 px-6 text-center uppercase tracking-widest z-[100] flex items-center justify-center gap-2 select-none flex-shrink-0">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
          <span>Evaluation Demo Mode Active — Simulated telemetry grid database</span>
        </div>
      )}
      <div className="flex-1 flex relative overflow-hidden">
      
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
                {auth.user?.role !== 'Project Examiner' && (
                  <button
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    className="text-zinc-500 hover:text-white transition p-1 outline-none flex-shrink-0"
                    title="Switch EOC Role"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
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

          {/* Quick Exit: Go Back Home */}
          <button
            onClick={() => setCurrentView('landing')}
            className={`w-full py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-cyan-500/50 text-zinc-300 hover:text-white transition rounded-xl text-center flex items-center justify-center gap-2 relative group cursor-pointer shadow-sm active:scale-95 ${
              sidebarExpanded ? 'text-[10px] font-bold uppercase tracking-wider' : 'text-xs'
            }`}
            title="Go Back Home"
          >
            <span>🏠</span>
            <span className={sidebarExpanded ? 'inline' : 'hidden'}>Go Back Home</span>
            {!sidebarExpanded && (
              <div className="absolute left-16 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none text-[8px] z-50">
                Go Back Home
              </div>
            )}
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
          onToggleRoadClosure={handleToggleRoadClosure}
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
          {/* Go Back Home Action Button */}
          <button
            type="button"
            onClick={() => setCurrentView('landing')}
            className="pointer-events-auto bg-zinc-950/95 hover:bg-zinc-900 backdrop-blur-md border border-white/10 hover:border-cyan-500/50 text-zinc-200 hover:text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider transition cursor-pointer active:scale-95 group"
            title="Return to the Main Home Portal"
          >
            <span className="text-sm group-hover:-translate-x-0.5 transition-transform">🏠</span>
            <span>Go Back Home</span>
          </button>

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

          {/* Project Examiner Banner Badge */}
          {auth.user?.role === 'Project Examiner' && (
            <div className="pointer-events-auto bg-zinc-950/95 backdrop-blur-md border border-amber-500/40 rounded-xl p-2.5 shadow-lg flex items-center gap-2.5 font-mono max-w-sm border-dashed">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <div className="leading-tight text-left">
                <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                  🔍 EVALUATION DEMO MODE
                </div>
                <div className="text-[7.5px] text-zinc-400 mt-0.5 leading-normal uppercase">
                  Read-only examiner console. Destructive commands and settings modification restricted.
                </div>
              </div>
            </div>
          )}

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
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg bg-black/30 border border-white/10 hover:border-cyan-500/50 text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <div className="w-[1px] h-4 bg-white/10"></div>

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
                onClick={handleToggleAutopilot}
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
            activeConsoleTab === 'archive' ? 'Saved Locations Archive' :
            activeConsoleTab === 'analyzer' ? 'AI Incident Scanner' :
            activeConsoleTab === 'sos' ? 'DistressSOS Portal' :
            activeConsoleTab === 'risk' ? 'Timeline Forecast' :
            activeConsoleTab === 'chat' ? 'Crisis Copilot AI' :
            activeConsoleTab === 'analytics' ? 'Metrics Report' : 'Briefing Dossiers'
          }
          subtitle={
            activeConsoleTab === 'dispatch' ? 'Dispatch ambulances, engines & SDRF squads' :
            activeConsoleTab === 'archive' ? 'Permanent spatial registry, historical coordinates & audit files' :
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
              onDispatchVehicle={handleDispatchVehicle}
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
              onRefreshIncidents={refreshIncidents}
            />
          )}

          {activeConsoleTab === 'archive' && (
            <SavedLocationsArchive
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                setSelectedVehicle(null);
                if (inc) {
                  addNotification(`[LOCATION REGISTRY] Centered on ${inc.type} at LAT ${inc.location.lat.toFixed(4)}, LNG ${inc.location.lng.toFixed(4)}.`, 'info');
                }
              }}
              addNotification={addNotification}
            />
          )}

          {activeConsoleTab === 'analyzer' && (
            <IncidentAnalyzer
              onAddIncident={(inc) => {
                const newInc = handleAddIncident(inc);
                if (newInc) setSelectedIncident(newInc);
              }}
              addNotification={addNotification}
            />
          )}

          {activeConsoleTab === 'sos' && (() => {
            const assignedVehicleForSelected = selectedIncident?.assignedVehicleId
              ? vehicles.find(v => v.id === selectedIncident.assignedVehicleId)
              : null;
            return (
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
                  {incidents.filter(inc => inc.isUserReported || inc.starred || inc.reporter === 'Citizen SOS' || inc.reporter === 'Citizen Portal' || inc.needsSOSValidation).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 italic text-[11px]">
                      NO ACTIVE CITIZEN DISTRESS SIGNALS REGISTERED
                    </div>
                  ) : (
                    incidents
                      .filter(inc => inc.isUserReported || inc.starred || inc.reporter === 'Citizen SOS' || inc.reporter === 'Citizen Portal' || inc.needsSOSValidation)
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
                          selectedIncident.type === 'POLICE_SOS' ? (
                            /* Simulated Police Agent Mobile Terminal Pager */
                            <div className="space-y-3 bg-zinc-950/80 border border-blue-500/40 p-4 rounded-xl text-xs font-mono relative overflow-hidden shadow-[0_0_15px_rgba(37,99,235,0.15)] animate-fade-in">
                              <div className="flex justify-between items-center border-b border-blue-500/30 pb-2">
                                <span className="text-blue-400 font-bold tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                  🚨 POLICE MOBILE PAGER
                                </span>
                                <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase font-bold">
                                  Cruiser Online
                                </span>
                              </div>

                              <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-lg space-y-2 text-[10px] leading-relaxed">
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Emergency Signal Lock</div>
                                <div className="text-white font-bold text-xs uppercase">Police SOS Request</div>
                                <div><strong>Ticket ID:</strong> {selectedIncident.id}</div>
                                <div><strong>Coordinates:</strong> LAT {selectedIncident.location.lat.toFixed(5)} • LNG {selectedIncident.location.lng.toFixed(5)}</div>
                                <div><strong>Time Logged:</strong> {selectedIncident.reportedAt}</div>
                                <div><strong>Incident Status:</strong> <span className="text-blue-400 font-bold uppercase">{selectedIncident.status}</span></div>

                                {assignedVehicleForSelected ? (
                                  <div className="border-t border-white/5 pt-2 mt-2 space-y-1 text-slate-300">
                                    <div className="text-[9px] text-blue-400 font-bold uppercase">Assigned Responder</div>
                                    <div><strong>Cruiser:</strong> {assignedVehicleForSelected.name}</div>
                                    <div><strong>Crew:</strong> {assignedVehicleForSelected.crewNames.join(', ')}</div>
                                    <div><strong>Cruiser Position:</strong> LAT {assignedVehicleForSelected.location.lat.toFixed(4)}, LNG {assignedVehicleForSelected.location.lng.toFixed(4)}</div>
                                    <div>
                                      <strong>Distance & ETA:</strong>{' '}
                                      {assignedVehicleForSelected.etaMinutes 
                                        ? `${assignedVehicleForSelected.etaMinutes} mins (${getDistance(assignedVehicleForSelected.location, selectedIncident.location).toFixed(1)} km)`
                                        : 'At Scene'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-amber-400 font-bold text-[9px] uppercase border-t border-white/5 pt-2 mt-2 animate-pulse">
                                    ⚠️ Search status: Scanning for nearest patrols...
                                  </div>
                                )}
                              </div>

                              {selectedIncident.photoBase64 && (
                                <div className="mt-2 space-y-1">
                                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold block">Attached Distress Photo</span>
                                  <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/60 max-h-36 flex justify-center items-center">
                                    <img 
                                      src={selectedIncident.photoBase64} 
                                      alt="Distress Scene" 
                                      className="max-w-full max-h-36 object-contain"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2 pt-1.5">
                                {selectedIncident.status === 'Police Notified' && assignedVehicleForSelected && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = {
                                        ...selectedIncident,
                                        status: 'Police Responding' as const
                                      };
                                      addNotification(`POLICE ACCEPTED: ${assignedVehicleForSelected.name} accepted SOS ${selectedIncident.id} and is deploying.`, 'emergency');
                                      handleUpdateIncident(updated);
                                    }}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-zinc-950 font-bold uppercase rounded-lg text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(37,99,235,0.3)]"
                                  >
                                    🚨 ACCEPT SOS & DISPATCH
                                  </button>
                                )}

                                {selectedIncident.status === 'Dispatched' && (
                                  <div className="text-center py-2 text-blue-400 font-bold text-[9px] uppercase animate-pulse border border-blue-500/20 rounded bg-blue-950/20">
                                    🚓 Cruiser En Route to Scene...
                                  </div>
                                )}

                                {selectedIncident.status === 'Active' && (
                                  <div className="space-y-2">
                                    <div className="text-center py-1.5 text-emerald-400 font-bold text-[9px] uppercase border border-emerald-500/20 rounded bg-emerald-950/20 animate-pulse">
                                      ✓ Patrol Arrived at Scene
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = {
                                          ...selectedIncident,
                                          status: 'Resolved' as const
                                        };
                                        addNotification(`RESOLVED: SOS ${selectedIncident.id} scene secured and resolved.`, 'success');
                                        handleUpdateIncident(updated);
                                      }}
                                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold uppercase rounded-lg text-[10px] tracking-wider transition-all cursor-pointer"
                                    >
                                      ✓ MARK EMERGENCY RESOLVED
                                    </button>
                                  </div>
                                )}

                                {selectedIncident.status === 'Resolved' && (
                                  <div className="text-center py-2 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/20 rounded bg-emerald-950/20">
                                    ✓ Emergency Resolved.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 bg-black/40 border border-white/5 p-3 rounded-lg text-xs">
                              <div>
                                <div className="text-red-400 font-bold uppercase">{selectedIncident.type}</div>
                                <div className="text-[9px] text-slate-500 mt-0.5">Ticket ID: {selectedIncident.id}</div>
                              </div>
                              
                              <p className="text-[10px] text-slate-300 italic bg-white/5 p-2 rounded">
                                &quot;{selectedIncident.description}&quot;
                              </p>

                              {selectedIncident.photoBase64 && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold block">Attached Distress Photo</span>
                                  <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/60 max-h-36 flex justify-center items-center">
                                    <img 
                                      src={selectedIncident.photoBase64} 
                                      alt="Distress Scene" 
                                      className="max-w-full max-h-36 object-contain"
                                    />
                                  </div>
                                </div>
                              )}

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
                          )
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
                            const newInc = handleAddIncident({
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
                          onLocationLock={handleUserLiveLocationLock}
                          compact={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
  </div>
  );
}

export default function HomePortal({ defaultView }: { defaultView?: 'landing' | 'admin' | 'citizen' }) {
  return (
    <AuthProvider>
      <HomePortalContent defaultView={defaultView} />
    </AuthProvider>
  );
}

function HomePortalContent({ defaultView }: { defaultView?: 'landing' | 'admin' | 'citizen' }) {
  const auth = useAuth();
  const [initStep, setInitStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Loading steps timeline
  useEffect(() => {
    if (initStep === 4 || initStep === 3) return;

    const timers: NodeJS.Timeout[] = [];

    // Step 0 -> 1 (emergency network): after 600ms
    timers.push(setTimeout(() => {
      setInitStep(prev => prev === 0 ? 1 : prev);
    }, 700));

    // Step 1 -> 2 (incident intel): after 1300ms
    timers.push(setTimeout(() => {
      setInitStep(prev => prev === 1 ? 2 : prev);
    }, 1400));

    // Step 2 -> 3 (Ready): after 2000ms, only if auth resolved loading
    timers.push(setTimeout(() => {
      if (!auth.loading) {
        setInitStep(3);
      }
    }, 2100));

    // Hard Handshake Timeout: after 3200ms
    timers.push(setTimeout(() => {
      if (auth.loading) {
        setInitStep(4); // Trigger EOC Connection Unavailable Error Screen
      } else {
        setInitStep(3); // Success transition
      }
    }, 3200));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [initStep, auth.loading, retryCount]);

  const handleRetry = () => {
    setInitStep(0);
    setRetryCount(prev => prev + 1);
  };

  const handleContinueDemo = () => {
    setIsDemoMode(true);
  };

  // If ready or continuing in demo mode, show main EOC app
  if ((initStep === 3 && !auth.loading) || isDemoMode) {
    return <HomeDashboard isDemoMode={isDemoMode} initialView={defaultView} />;
  }

  // Connection Unavailable screen
  if (initStep === 4) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono p-6 text-center select-none text-zinc-300">
        <div className="max-w-md w-full border border-red-500/30 bg-red-950/10 p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
          {/* Top warning accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse"></div>
          
          <div className="flex justify-center text-red-500">
            <AlertTriangle className="w-12 h-12 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h1 className="text-sm font-bold uppercase tracking-wider text-red-500">
              EOC CONNECTION UNAVAILABLE
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase leading-relaxed">
              Some live command network databases could not be reached. Connection handshake timed out.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/40 border border-red-500/50 hover:border-red-500 text-red-400 font-bold uppercase rounded-xl transition text-[10px] tracking-wider cursor-pointer active:scale-[0.98]"
            >
              🔄 Retry Connection
            </button>
            <button
              onClick={handleContinueDemo}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-400 font-bold uppercase rounded-xl transition text-[10px] tracking-wider cursor-pointer active:scale-[0.98]"
            >
              🛡️ Continue in Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active secure handshake loading screen
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono select-none p-6">
      <div className="max-w-sm w-full space-y-8 text-center">
        {/* Main Branding Focus */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider text-white uppercase leading-none">
            RESQAI
          </h1>
          <h2 className="text-xs md:text-sm font-bold tracking-widest text-cyan-400 uppercase">
            AI-Powered Disaster Response
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Detect. Coordinate. Respond. Save lives.
          </p>
        </div>

        <div className="w-12 h-12 mx-auto flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
        </div>

        {/* System Initializing Status Box */}
        <div className="bg-zinc-900/60 border border-white/5 p-4 rounded-xl text-left text-[9px] uppercase tracking-wider font-mono space-y-3">
          <div className="text-[10px] font-bold text-white tracking-widest border-b border-white/5 pb-1.5 flex items-center justify-between">
            <span>SYSTEM INITIALIZING...</span>
            <span className="text-[7px] text-zinc-500 normal-case italic font-normal">
              EOC Secure Handshake • Connected
            </span>
          </div>

          <div className="space-y-2 text-zinc-400">
            <div className="flex justify-between items-center">
              <span>EOC</span>
              <span className={initStep >= 0 ? "text-emerald-400 font-bold animate-pulse" : "text-zinc-600"}>
                {initStep >= 0 ? "● CONNECTED" : "○ OFFLINE"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>AI ENGINE</span>
              <span className={initStep >= 1 ? "text-emerald-400 font-bold animate-pulse" : "text-zinc-600"}>
                {initStep >= 1 ? "● READY" : "○ SYNCING"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>LIVE MAP</span>
              <span className={initStep >= 2 ? "text-emerald-400 font-bold animate-pulse" : "text-zinc-600"}>
                {initStep >= 2 ? "● READY" : "○ CACHING"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>RESPONSE NETWORK</span>
              <span className={initStep >= 2 ? "text-emerald-400 font-bold animate-pulse" : "text-zinc-600"}>
                {initStep >= 2 ? "● READY" : "○ INDEXING"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
