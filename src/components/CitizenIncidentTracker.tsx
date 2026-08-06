'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Search, ArrowLeft, Clock, Shield, CheckCircle2, 
  MapPin, Truck, AlertTriangle, Users, HeartHandshake,
  Activity, ArrowRight
} from 'lucide-react';
import { Incident, Vehicle } from '../utils/mockData';
import CitizenSOS from './CitizenSOS';

interface CitizenIncidentTrackerProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident | null) => void;
  onAddIncident: (inc: Omit<Incident, 'id' | 'reportedAt' | 'status'>) => void;
  addNotification: (msg: string, type: 'emergency' | 'warning' | 'info' | 'success') => void;
  onUpdateIncident?: (updated: Incident) => void;
}

export default function CitizenIncidentTracker({
  incidents,
  vehicles,
  selectedIncident,
  onSelectIncident,
  onAddIncident,
  addNotification,
  onUpdateIncident
}: CitizenIncidentTrackerProps) {
  const [activeTab, setActiveTab] = useState<'report' | 'track'>('report');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter reported incidents by search query
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const query = searchQuery.toLowerCase();
      return (
        inc.type.toLowerCase().includes(query) ||
        inc.description.toLowerCase().includes(query)
      );
    });
  }, [incidents, searchQuery]);

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

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs text-slate-300">
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
              compact={true}
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
                        <span className="text-sm font-bold text-white uppercase">{selectedIncident.type} crisis</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-500/20 text-[9px] uppercase font-bold">
                        Sev: {selectedIncident.severity}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {selectedIncident.description}
                    </p>

                    <div className="mt-3 flex items-center space-x-4 text-[10px] text-slate-500">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lat {selectedIncident.location.lat.toFixed(4)}, Lng {selectedIncident.location.lng.toFixed(4)}</span>
                      </div>
                      <span>•</span>
                      <span>Reported: {selectedIncident.reportedAt}</span>
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
                {/* Search Box */}
                <div className="relative mb-3 flex-shrink-0">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search reported disasters (e.g. Flood, Musi, Fire)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 border border-dashed border-white/5 rounded-xl flex-1 flex flex-col justify-center items-center">
                    <AlertTriangle className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-[11px] mb-2 font-bold uppercase text-slate-400">No active incidents found</p>
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
                      Active Disaster Feeds ({filteredIncidents.length})
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

                      return (
                        <div 
                          key={inc.id}
                          className="p-3 rounded-xl border bg-white/5 border-white/5 hover:border-white/10 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-sm">{emoji}</span>
                                <div>
                                  <span className="font-bold text-white uppercase text-[10px]">{inc.type}</span>
                                  <span className="text-[8px] text-slate-500 block">ID: {inc.id} • {inc.reportedAt}</span>
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${statusColor} uppercase tracking-wider`}>
                                {inc.status}
                              </span>
                            </div>

                            <p className="text-slate-400 text-[10px] line-clamp-2 leading-relaxed mb-3">
                              {inc.description}
                            </p>
                          </div>

                          <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
                            <div className="flex items-center space-x-2 text-[9px] text-slate-500">
                              <span className="px-1 py-0.5 rounded bg-white/5 font-mono text-[8px] border border-white/10 text-red-400 font-bold">
                                Severity: {inc.severity}
                              </span>
                              <span>•</span>
                              <span>{inc.trappedCount} trapped</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectIncident(inc)}
                              className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-bold transition text-[9px] flex items-center space-x-1"
                            >
                              <span>Track Operations</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
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
