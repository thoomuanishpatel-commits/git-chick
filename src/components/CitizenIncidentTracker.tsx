'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, ArrowLeft, Clock, Shield, CheckCircle2, 
  MapPin, Truck, AlertTriangle, Users, HeartHandshake,
  Activity, ArrowRight, ExternalLink, Copy, Check, Share2, Navigation, Star
} from 'lucide-react';
import { Incident, Vehicle } from '../utils/mockData';
import CitizenSOS from './CitizenSOS';

const getDistance = (loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }) => {
  const R = 6371; // km
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface CitizenIncidentTrackerProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident | null) => void;
  onAddIncident: (inc: Omit<Incident, 'id' | 'reportedAt' | 'status'> & { status?: Incident['status']; addressContext?: string }) => void;
  addNotification: (msg: string, type: 'emergency' | 'warning' | 'info' | 'success') => void;
  onUpdateIncident?: (updated: Incident) => void;
  onLocationLock?: (loc: { lat: number; lng: number } | null) => void;
  overrideLocation?: { lat: number; lng: number } | null;
}

const DEFAULT_USER_ZONE = {
  lat: 17.47218,
  lng: 78.42259,
  name: 'Ward 115 Balaji Nagar, Greater Hyderabad Municipal Corporation West Zone, Hyderabad'
};

export default function CitizenIncidentTracker({
  incidents,
  vehicles,
  selectedIncident,
  onSelectIncident,
  onAddIncident,
  addNotification,
  onUpdateIncident,
  onLocationLock,
  overrideLocation = null
}: CitizenIncidentTrackerProps) {
  const [activeTab, setActiveTab] = useState<'report' | 'track'>('report');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
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
    return null;
  });

  const handleChildLocationLock = useCallback((loc: { lat: number; lng: number } | null) => {
    if (!loc) return;
    setUserLocation(prev => {
      if (prev && Math.abs(prev.lat - loc.lat) < 0.00001 && Math.abs(prev.lng - loc.lng) < 0.00001) {
        return prev;
      }
      return loc;
    });
    onLocationLock?.(loc);
  }, [onLocationLock]);

  // Obtain live browser location for distance calculations only if not already set
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Copy shareable disaster link
  const handleCopyLink = (inc: Incident) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('incident', inc.id);
    if (inc.type) params.set('type', inc.type);
    if (inc.location) {
      params.set('lat', inc.location.lat.toString());
      params.set('lng', inc.location.lng.toString());
    }
    if (inc.severity) params.set('sev', inc.severity.toString());
    if (inc.addressContext) params.set('addr', inc.addressContext);
    if (inc.description) params.set('desc', inc.description);

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${inc.location.lat},${inc.location.lng}`;
    const fullText = `🚨 RESQAI DISASTER ALERT - ${inc.type}\nSector: ${inc.addressContext || `${inc.location.lat.toFixed(4)}°N, ${inc.location.lng.toFixed(4)}°E`}\nLive Portal: ${shareUrl}\nGoogle Maps Navigation: ${gmapsUrl}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedId(inc.id);
      setTimeout(() => setCopiedId(null), 2500);
      addNotification(`LINK COPIED: Disaster dispatch link and navigation coordinates copied to clipboard.`, 'success');
    }).catch(() => {
      addNotification('Could not copy link to clipboard.', 'warning');
    });
  };

  // Switch tab when an incident gets selected externally (e.g. from clicking on map)
  useEffect(() => {
    if (selectedIncident) {
      setActiveTab('track');
    }
  }, [selectedIncident]);

  // Count active incidents (not resolved or closed)
  const activeIncidentsCount = useMemo(() => {
    return incidents.filter(inc => inc.status !== 'Resolved' && inc.status !== 'Closed').length;
  }, [incidents]);

  // Filter reported incidents by search query and status
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const isResolved = inc.status === 'Resolved' || inc.status === 'Closed';
      if (statusFilter === 'active' && isResolved) return false;
      if (statusFilter === 'resolved' && !isResolved) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inc.type.toLowerCase().includes(query) ||
          inc.description.toLowerCase().includes(query) ||
          (inc.addressContext && inc.addressContext.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [incidents, searchQuery, statusFilter]);

  const assignedVehicle = useMemo(() => {
    if (!selectedIncident || !selectedIncident.assignedVehicleId) return null;
    return vehicles.find(v => v.id === selectedIncident.assignedVehicleId) || null;
  }, [selectedIncident, vehicles]);

  // Timeline steps calculator
  const timelineSteps = useMemo(() => {
    if (!selectedIncident) return [];
    const status = selectedIncident.status;
    return [
      { label: 'Reported', active: true, done: true },
      { 
        label: 'Dispatched', 
        active: ['Dispatched', 'En Route', 'Active', 'Resolved'].includes(status), 
        done: ['Dispatched', 'En Route', 'Active', 'Resolved'].includes(status) 
      },
      { 
        label: 'En Route', 
        active: ['En Route', 'Active', 'Resolved'].includes(status), 
        done: ['En Route', 'Active', 'Resolved'].includes(status) 
      },
      { 
        label: 'Rescue Active', 
        active: ['Active', 'Resolved'].includes(status), 
        done: ['Active', 'Resolved'].includes(status) 
      },
      { 
        label: 'Resolved', 
        active: status === 'Resolved', 
        done: status === 'Resolved' 
      }
    ];
  }, [selectedIncident]);

  // Handle reporting additional help request
  const handleRequestAssistance = () => {
    if (!selectedIncident) return;
    const updated = {
      ...selectedIncident,
      trappedCount: selectedIncident.trappedCount + 1
    };
    if (onUpdateIncident) {
      onUpdateIncident(updated);
    }
    addNotification(`CITIZEN UPDATE: Additional help requested at ${selectedIncident.type} scene. Trapped count: ${updated.trappedCount}`, 'emergency');
  };

  // Handle reporting safe
  const handleReportSafe = () => {
    if (!selectedIncident || selectedIncident.trappedCount <= 0) return;
    const updated = {
      ...selectedIncident,
      trappedCount: selectedIncident.trappedCount - 1
    };
    if (onUpdateIncident) {
      onUpdateIncident(updated);
    }
    addNotification(`CITIZEN UPDATE: A citizen reported safe at ${selectedIncident.type} scene. Trapped count: ${updated.trappedCount}`, 'success');
  };

  // Generate safety instructions
  const getSafetyAdvice = (type: string) => {
    switch (type) {
      case 'Flood':
        return {
          title: 'Flood Survival Directives',
          tips: [
            'Do NOT attempt to wade or drive through flowing water.',
            'Move immediately to higher floors or roofs with access.',
            'Store clean water and dry food packages.',
            'Switch off main electrical breakers if safe to do so.'
          ]
        };
      case 'Fire':
        return {
          title: 'Fire Safety Instructions',
          tips: [
            'Crawl low under smoke to avoid toxic gas inhalation.',
            'Check door heat with back of hand before opening.',
            'Do NOT use elevators. Use fire stairs only.',
            'Assemble at designated open areas away from structure.'
          ]
        };
      case 'Snake Sighting':
        return {
          title: 'Reptile Safety Guidelines',
          tips: [
            'Keep safe distance. Do not antagonize or touch the snake.',
            'Keep pets and children locked inside rooms.',
            'Maintain line-of-sight visual contact from a safe distance.',
            'Forest Dept snake rescue specialists are dispatching.'
          ]
        };
      case 'Chemical Leak':
        return {
          title: 'Chemical Leak Shelter protocols',
          tips: [
            'Shelter indoors immediately. Close and seal all windows.',
            'Turn off AC, blowers, and intake ventilation fans.',
            'Breathe through a damp cloth or towel over mouth.',
            'Stay tuned to emergency warning systems.'
          ]
        };
      case 'Medical Emergency':
        return {
          title: 'Immediate First Aid advice',
          tips: [
            'Ensure the victim is breathing and airway is clear.',
            'Apply pressure with clean cloth to control bleeding.',
            'Keep patient warm and calm. Avoid moving neck/back.',
            'Paramedic unit dispatched. Follow instructions closely.'
          ]
        };
      default:
        return {
          title: 'Emergency Safety Rules',
          tips: [
            'Clear the coordinate zone for emergency vehicle entry.',
            'Follow directives from police and disaster authorities.',
            'Request status updates through this tracking terminal.',
            'Nearest active staging center: Gachibowli Stadium Camp.'
          ]
        };
    }
  };

  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [isSendingSos, setIsSendingSos] = useState(false);

  // Find active POLICE_SOS reported by this citizen
  const activeSosIncident = useMemo(() => {
    return incidents.find(inc => inc.type === 'POLICE_SOS' && inc.status !== 'Closed') || null;
  }, [incidents]);

  const assignedSosVehicle = useMemo(() => {
    if (!activeSosIncident?.assignedVehicleId) return null;
    return vehicles.find(v => v.id === activeSosIncident.assignedVehicleId) || null;
  }, [activeSosIncident, vehicles]);

  const triggerPoliceSos = () => {
    if (isSendingSos) return;
    setIsSendingSos(true);

    let cachedName: string | undefined;
    try {
      const cached = localStorage.getItem('resqai_exact_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.name) cachedName = parsed.name;
      }
    } catch (e) {}

    const sendRequest = (coords: { lat: number; lng: number }, addr?: string) => {
      onAddIncident({
        type: 'POLICE_SOS',
        category: 'Public Safety',
        severity: 60,
        location: coords,
        addressContext: addr || (coords.lat === DEFAULT_USER_ZONE.lat ? DEFAULT_USER_ZONE.name : `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`),
        description: 'POLICE SOS: Immediate police assistance requested by citizen.',
        casualtyEstimate: 0,
        trappedCount: 0,
        requiredResources: ['Police Patrol'],
        reporter: 'Citizen Portal',
        isUserReported: true,
        starred: true,
        needsSOSValidation: false,
        aiPriority: 'MEDIUM',
        etaResolution: 1
      });
      setIsSendingSos(false);
      setShowSosConfirm(false);
      addNotification('POLICE SOS SENT: Emergency police dispatch initiated.', 'emergency');
    };

    if (userLocation) {
      sendRequest(userLocation, cachedName);
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendRequest({ lat: pos.coords.latitude, lng: pos.coords.longitude }, cachedName);
        },
        () => {
          sendRequest({
            lat: DEFAULT_USER_ZONE.lat,
            lng: DEFAULT_USER_ZONE.lng
          }, DEFAULT_USER_ZONE.name);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      sendRequest({ lat: DEFAULT_USER_ZONE.lat, lng: DEFAULT_USER_ZONE.lng }, DEFAULT_USER_ZONE.name);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs text-slate-300">
      {/* POLICE SOS PANEL */}
      <div className="mb-4 p-3 bg-zinc-950/40 border border-white/10 rounded-xl flex flex-col justify-between relative overflow-hidden flex-shrink-0">
        {activeSosIncident ? (
          // Active SOS Status HUD
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-red-500/20 pb-1.5">
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                <span>🚨 POLICE SOS ACTIVE</span>
              </div>
              <span className="text-[9px] text-zinc-500">ID: {activeSosIncident.id}</span>
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed bg-red-950/10 border border-red-500/20 p-2 rounded-lg">
              {activeSosIncident.status === 'Resolved' ? (
                <span className="text-emerald-400 font-bold">✓ Emergency Resolved. Police team cleared.</span>
              ) : (
                <span>🚨 SOS sent successfully. Police assistance has been requested.</span>
              )}
            </p>

            {/* Assigned Police Patrol Telemetry details */}
            {activeSosIncident.status !== 'Resolved' && (
              assignedSosVehicle ? (
                <div className="p-2.5 bg-zinc-900/60 border border-white/5 rounded-lg space-y-1 text-[9px] text-slate-300">
                  <div className="text-red-400 font-bold uppercase flex items-center gap-1.5 text-[10px] border-b border-white/5 pb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>👮 ASSIGNED POLICE RESPONDER</span>
                  </div>
                  <div><strong>Patrol Unit:</strong> {assignedSosVehicle.name}</div>
                  <div><strong>Responding Officers:</strong> {assignedSosVehicle.crewNames.join(', ')}</div>
                  <div>
                    <strong>Response Status:</strong>{' '}
                    <span className="text-emerald-400 font-bold">
                      {activeSosIncident.status === 'Pending' || activeSosIncident.status === 'SOS Sent' ? 'DISPATCHING...' :
                       activeSosIncident.status === 'Police Notified' ? 'WAITING ACCEPTANCE' :
                       activeSosIncident.status === 'Dispatched' ? 'EN ROUTE' :
                       activeSosIncident.status === 'Active' ? 'AT SCENE / HANDLING' : 'RESOLVED'}
                    </span>
                  </div>
                  {assignedSosVehicle.etaMinutes && (
                    <div><strong>Estimated Arrival:</strong> {assignedSosVehicle.etaMinutes} mins ({getDistance(assignedSosVehicle.location, activeSosIncident.location).toFixed(1)} km)</div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-red-950/10 border border-red-500/20 rounded-lg text-center text-amber-500 font-bold text-[9px] uppercase animate-pulse">
                  ⚠️ Dispatch status: Scanning for nearest patrols...
                </div>
              )
            )}

            {/* SOS Status Steps Tracker */}
            <div className="grid grid-cols-4 gap-1 text-[8px] font-bold text-center uppercase tracking-tighter pt-1">
              {[
                { label: 'SOS Sent', match: ['Pending', 'SOS Sent', 'Police Notified', 'Police Responding', 'Resolved'] },
                { label: 'Notified', match: ['Police Notified', 'Police Responding', 'Resolved'] },
                { label: 'Responding', match: ['Police Responding', 'Resolved'] },
                { label: 'Resolved', match: ['Resolved'] }
              ].map((step, idx) => {
                const isCompleted = step.match.includes(activeSosIncident.status);
                const isActive = activeSosIncident.status === step.label || 
                  (step.label === 'SOS Sent' && activeSosIncident.status === 'Pending') ||
                  (step.label === 'Notified' && activeSosIncident.status === 'Police Notified') ||
                  (step.label === 'Responding' && activeSosIncident.status === 'Police Responding');
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-bold mb-1 transition-all ${
                      isCompleted 
                        ? 'bg-red-950 border-red-500 text-red-400' 
                        : 'bg-zinc-900 border-white/5 text-slate-600'
                    } ${isActive ? 'animate-pulse ring-1 ring-red-500/30' : ''}`}>
                      {isCompleted && activeSosIncident.status === 'Resolved' && idx === 3 ? '✓' : idx + 1}
                    </div>
                    <span className={isCompleted ? 'text-red-400' : 'text-slate-600'}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            
            {activeSosIncident.status === 'Resolved' && (
              <button
                type="button"
                onClick={() => {
                  if (onUpdateIncident) {
                    onUpdateIncident({
                      ...activeSosIncident,
                      status: 'Closed'
                    });
                  }
                }}
                className="w-full py-1.5 bg-zinc-900 border border-white/10 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg transition text-[9px] uppercase tracking-wider font-bold"
              >
                Dismiss Resolved Alert
              </button>
            )}
          </div>
        ) : showSosConfirm ? (
          // Confirmation dialog view
          <div className="space-y-3 py-1 animate-fade-in">
            <span className="text-red-500 font-bold uppercase tracking-wider block text-[10px]">⚠️ Confirm Police SOS Alert</span>
            <p className="text-[10px] text-slate-300 leading-normal">
              Are you sure you want to send an SOS request to the police?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSendingSos}
                onClick={triggerPoliceSos}
                className="py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-slate-950 font-bold uppercase rounded-lg text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center"
              >
                {isSendingSos ? 'TRANSMITTING...' : 'Send SOS'}
              </button>
              <button
                type="button"
                disabled={isSendingSos}
                onClick={() => setShowSosConfirm(false)}
                className="py-2 bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 uppercase rounded-lg text-[10px] tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // Default State: SOS Button
          <div className="space-y-2 py-1 flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => setShowSosConfirm(true)}
              className="w-full py-3 bg-red-950/40 border border-red-500/50 hover:bg-red-900/40 hover:border-red-500 text-red-500 hover:text-red-400 font-bold uppercase rounded-xl text-xs tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🚨</span> SOS – REQUEST POLICE ASSISTANCE <span>🚨</span>
            </button>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
              For immediate police assistance only
            </span>
          </div>
        )}
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-white/5 mb-4 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('report');
            onSelectIncident(null);
          }}
          className={`flex-1 pb-3 text-center font-bold tracking-wider uppercase transition-colors ${
            activeTab === 'report' && !selectedIncident
              ? 'border-b-2 border-red-500 text-red-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          🚨 Report Distress
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('track')}
          className={`flex-1 pb-3 text-center font-bold tracking-wider uppercase transition-colors flex items-center justify-center space-x-1.5 ${
            activeTab === 'track' || selectedIncident
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span>🔍 Track Operations</span>
          {activeIncidentsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 animate-pulse font-mono">
              {activeIncidentsCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {activeTab === 'report' && !selectedIncident ? (
          /* Report Tab: Render existing CitizenSOS component */
          <div className="flex-1 overflow-y-auto">
            <CitizenSOS 
              onAddIncident={onAddIncident}
              addNotification={addNotification}
              onLocationLock={handleChildLocationLock}
              compact={true}
              overrideLocation={overrideLocation}
            />
          </div>
        ) : (
          /* Track Tab */
          <div className="flex-1 flex flex-col min-h-0">
            {selectedIncident ? (
              /* Sub-view: Detailed Tracking HUD */
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Back button and incident title */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <button
                      type="button"
                      onClick={() => onSelectIncident(null)}
                      className="flex items-center space-x-1 text-slate-400 hover:text-white transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>BACK TO LIST</span>
                    </button>
                    <span className="text-[10px] text-slate-500">TRACKING ID: {selectedIncident.id}</span>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/5 to-transparent pointer-events-none rounded-full" />
                    
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white uppercase">{selectedIncident.type} crisis</span>
                          {(selectedIncident.isUserReported || selectedIncident.starred) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-bold flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span>Citizen Report</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-500/20 text-[9px] uppercase font-bold">
                        Sev: {selectedIncident.severity}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {selectedIncident.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-white/5 pt-2">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{selectedIncident.location.lat.toFixed(4)}°N, {selectedIncident.location.lng.toFixed(4)}°E</span>
                        {userLocation && (
                          <span className="text-zinc-500 hidden sm:inline">
                            • {getDistance(userLocation, selectedIncident.location).toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(selectedIncident)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white font-mono text-[9px] flex items-center gap-1 transition cursor-pointer"
                          title="Copy shareable link to this disaster location"
                        >
                          {copiedId === selectedIncident.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === selectedIncident.id ? 'COPIED' : 'SHARE LINK'}</span>
                        </button>
                        
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIncident.location.lat},${selectedIncident.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-mono text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Open Google Maps driving/transit directions to this location"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>NAVIGATE</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Progress Timeline */}
                  <div className="flex items-center justify-between px-1 relative mb-2">
                    <div className="absolute left-6 right-6 top-[15px] h-[2px] bg-white/5 z-0" />
                    {timelineSteps.map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center z-10 relative">
                        <div 
                          className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-mono transition-all ${
                            step.done
                              ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                              : step.active
                              ? 'bg-cyan-950 border-cyan-500 text-cyan-400 animate-pulse'
                              : 'bg-zinc-955 border-white/5 text-slate-600'
                          }`}
                        >
                          {step.done ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <span className={`text-[8px] mt-1 font-bold uppercase tracking-tighter ${
                          step.active ? 'text-white' : 'text-slate-600'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Dispatch details card */}
                  {assignedVehicle ? (
                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center space-x-1.5">
                          <Truck className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-white uppercase text-[10px] tracking-wide">Assigned Rescue Vector</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20 text-[9px] uppercase font-bold">
                          {assignedVehicle.status === 'EnRoute' ? '🚚 EN ROUTE' : '🚨 ACTIVE ON SCENE'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                        <div>
                          <span className="text-slate-500 block uppercase text-[8px]">Responder Unit</span>
                          <span className="text-slate-200 font-bold block truncate">{assignedVehicle.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase text-[8px]">Deployment Type</span>
                          <span className="text-slate-200 block">{assignedVehicle.type}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase text-[8px]">Live Velocity</span>
                          <span className="text-slate-200 block font-mono">{assignedVehicle.speed} KM/H</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase text-[8px]">ETA to Site</span>
                          <span className="text-cyan-400 font-bold block font-mono">
                            {assignedVehicle.status === 'Active' ? 'ARRIVED & ENGAGED' : `${assignedVehicle.etaMinutes || 3} MINUTES`}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-2 text-[10px] space-y-1">
                        <div>
                          <span className="text-slate-500 uppercase text-[8px] block">Active Mission Details</span>
                          <span className="text-slate-300 leading-relaxed block">{assignedVehicle.missionDescription || 'Executing standard rescue protocols.'}</span>
                        </div>
                        <div className="pt-1 flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-400 truncate">
                            Crew ({assignedVehicle.crewSize}): <strong className="text-slate-300">{assignedVehicle.crewNames.join(', ')}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900/40 border border-dashed border-white/10 rounded-xl p-3 text-center space-y-2">
                      <Clock className="w-5 h-5 text-amber-500 mx-auto animate-pulse" />
                      <span className="font-bold text-amber-500 uppercase text-[10px] block tracking-wide">Evaluating Response Logistics</span>
                      <p className="text-slate-400 text-[10px] leading-relaxed max-w-xs mx-auto">
                        The AI dispatcher is identifying the closest available rescue squad. TSDMA EOC Command is establishing emergency staging.
                      </p>
                      <div className="bg-black/20 p-2 rounded text-[9px] text-slate-500 text-left space-y-0.5">
                        <span className="text-slate-400 font-bold uppercase block text-[8px]">AI Copilot Recommendation:</span>
                        <span className="block text-slate-400 leading-normal">
                          Deploy nearest {
                            ['Fire', 'Chemical Leak'].includes(selectedIncident.type) ? 'Fire Truck or SDRF Hazmat' :
                            ['Flood', 'Cyclone'].includes(selectedIncident.type) ? 'Rescue Boat or Helicopter' :
                            ['Medical Emergency', 'Building Collapse'].includes(selectedIncident.type) ? 'Ambulance Unit' :
                            'Police Patrol / General Rescue'
                          } to coordinates.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Safety advice and counts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Live crisis counts */}
                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 text-[10px] space-y-1.5 flex flex-col justify-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">Live Incident Staging Stats</span>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Reported Trapped:</span>
                          <span className="font-bold text-white">{selectedIncident.trappedCount} Citizens</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimated Casualties:</span>
                          <span className="font-bold text-red-400">{selectedIncident.casualtyEstimate} Lives</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Authority in Charge:</span>
                          <span className="font-bold text-cyan-400">TSDMA EOC</span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic advice */}
                    {getSafetyAdvice(selectedIncident.type) && (
                      <div className="bg-amber-950/10 border border-amber-500/20 rounded-xl p-3 text-[10px] space-y-1.5 flex flex-col justify-center">
                        <div className="flex items-center space-x-1.5 text-amber-400 font-bold uppercase text-[9px] tracking-wide">
                          <Shield className="w-3.5 h-3.5 text-amber-500" />
                          <span>⚠️ {getSafetyAdvice(selectedIncident.type).title}</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                          {getSafetyAdvice(selectedIncident.type).tips.map((tip, index) => (
                            <li key={index} className="leading-tight">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive buttons */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleRequestAssistance}
                    className="py-2.5 px-1 rounded bg-red-950/30 hover:bg-red-900/30 border border-red-500/30 text-red-400 font-bold transition text-[10px] flex items-center justify-center space-x-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>REQUEST HELP HERE</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReportSafe}
                    disabled={selectedIncident.trappedCount <= 0}
                    className="py-2.5 px-1 rounded bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 font-bold transition text-[10px] flex items-center justify-center space-x-1 disabled:opacity-40 disabled:hover:bg-emerald-950/30"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>REPORT I AM SAFE</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Sub-view: Reported Incidents List */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search Box and Status Tabs */}
                <div className="space-y-2 mb-3 flex-shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search reported disasters (e.g. Flood, Musi, Fire)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2 py-1 rounded transition uppercase ${
                        statusFilter === 'all'
                          ? 'bg-cyan-500 text-black'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({incidents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('active')}
                      className={`px-2 py-1 rounded transition uppercase ${
                        statusFilter === 'active'
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Active ({activeIncidentsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('resolved')}
                      className={`px-2 py-1 rounded transition uppercase ${
                        statusFilter === 'resolved'
                          ? 'bg-emerald-600 text-black'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Resolved ({incidents.length - activeIncidentsCount})
                    </button>
                  </div>
                </div>

                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 border border-dashed border-white/5 rounded-xl flex-1 flex flex-col justify-center items-center">
                    <AlertTriangle className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-[11px] mb-2 font-bold uppercase text-slate-400">No matching incidents found</p>
                    <p className="text-[10px] text-slate-500 max-w-xs px-4 mb-4">
                      No disaster reports matching your search or active in the Telangana region.
                    </p>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('report')}
                      className="px-3 py-1.5 text-[10px] bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/30 rounded font-bold transition uppercase"
                    >
                      Report New Emergency
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider block mb-2">
                      Reported Disaster Locations ({filteredIncidents.length})
                    </p>
                    {filteredIncidents.map(inc => {
                      let emoji = '🚨';
                      if (inc.type === 'Flood') emoji = '🌊';
                      else if (inc.type === 'Fire') emoji = '🔥';
                      else if (inc.type === 'Chemical Leak') emoji = '☢️';
                      else if (inc.type === 'Building Collapse') emoji = '🏢';
                      else if (inc.type === 'Landslide') emoji = '⛰️';
                      else if (inc.type === 'Snake Sighting') emoji = '🐍';
                      else if (inc.type === 'Medical Emergency') emoji = '🚑';
                      else if (inc.type === 'Road Blockage') emoji = '🚧';
                      else if (inc.type === 'Power Failure') emoji = '⚡';

                      let statusColor = 'text-amber-400 bg-amber-950/20 border-amber-500/20';
                      if (inc.status === 'Dispatched') statusColor = 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20';
                      else if (inc.status === 'En Route') statusColor = 'text-cyan-400 bg-cyan-950/20 border-cyan-500/20';
                      else if (inc.status === 'Active') statusColor = 'text-red-400 bg-red-950/20 border-red-500/20';
                      else if (inc.status === 'Resolved') statusColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20';

                      const distanceKm = userLocation ? getDistance(userLocation, inc.location) : null;
                      const isCopied = copiedId === inc.id;

                      return (
                        <div 
                          key={inc.id}
                          className="p-3 rounded-xl border bg-white/5 border-white/5 hover:border-white/10 transition flex flex-col justify-between space-y-2"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-sm">{emoji}</span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white uppercase text-[10px]">{inc.type}</span>
                                    {(inc.isUserReported || inc.starred) && (
                                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[7px] font-bold flex items-center gap-0.5">
                                        <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                                        <span>Citizen Report</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-slate-500 block">ID: {inc.id} • {inc.reportedAt}</span>
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${statusColor} uppercase tracking-wider`}>
                                {inc.status}
                              </span>
                            </div>

                            <p className="text-slate-400 text-[10px] line-clamp-2 leading-relaxed mb-2">
                              {inc.description}
                            </p>

                            {/* Location Coordinate & Share Bar */}
                            <div className="flex items-center justify-between text-[8.5px] font-mono text-zinc-400 bg-black/25 p-1.5 rounded border border-white/5">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                <span>{inc.location.lat.toFixed(4)}°N, {inc.location.lng.toFixed(4)}°E</span>
                                {distanceKm !== null && (
                                  <span className="text-cyan-400 font-bold">• {distanceKm.toFixed(1)} km away</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLink(inc);
                                }}
                                className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-white/10 transition"
                                title="Copy direct link to this disaster location"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? 'Copied' : 'Share'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-white/5 pt-2">
                            <div className="flex items-center space-x-2 text-[9px] text-slate-500">
                              <span className="px-1 py-0.5 rounded bg-white/5 font-mono text-[8px] border border-white/10 text-red-400 font-bold">
                                Sev: {inc.severity}%
                              </span>
                              <span>•</span>
                              <span>{inc.trappedCount} trapped</span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${inc.location.lat},${inc.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-cyan-400 hover:text-white font-bold transition text-[9px] flex items-center space-x-1 cursor-pointer"
                                title="Open Google Maps directions to this location"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Directions</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => onSelectIncident(inc)}
                                className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-bold transition text-[9px] flex items-center space-x-1 cursor-pointer"
                              >
                                <span>Track</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
