'use client';

import { useState } from 'react';
import { Truck, Compass, Settings, Battery, ShieldCheck, Package, AlertTriangle } from 'lucide-react';
import { Incident, Vehicle, Warehouse, Shelter, Hospital } from '../utils/mockData';
import { recommendVehiclesForIncident, rankWarehousesForSupply } from '../utils/routing';

interface RescuePlannerProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  warehouses: Warehouse[];
  shelters: Shelter[];
  hospitals: Hospital[];
  hazards: { type: string; location: { lat: number; lng: number }; radiusKm: number }[];
  roadClosures: { lat: number; lng: number }[];
  onDispatchVehicle: (vehicleId: string, incidentId: string) => void;
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident | null) => void;
  addNotification: (msg: string, type: 'emergency' | 'warning' | 'info' | 'success') => void;
  triggerSupplyDelivery: (vehicleId: string, warehouseId: string, shelterId: string, itemType: string, amount: number) => void;
  selectedVehicle?: Vehicle | null;
  onSelectVehicle?: (vehicle: Vehicle | null) => void;
  selectedCategory?: string;
  onChangeCategory?: (category: string) => void;
  onUpdateIncident?: (incident: Incident) => void;
}

export default function RescuePlanner({
  incidents,
  vehicles,
  warehouses,
  shelters,
  hospitals: _hospitals,
  hazards,
  roadClosures,
  onDispatchVehicle,
  selectedIncident,
  onSelectIncident,
  addNotification,
  triggerSupplyDelivery: _triggerSupplyDelivery,
  selectedVehicle,
  onSelectVehicle,
  selectedCategory = 'All',
  onChangeCategory,
  onUpdateIncident,
}: RescuePlannerProps) {
  const [plannerTab, setPlannerTab] = useState<'dispatch' | 'fleet' | 'supplies'>('dispatch');

  // Supply states
  const [selectedShelterId, setSelectedShelterId] = useState('');
  const [supplyType, setSupplyType] = useState<'food' | 'water' | 'medicine' | 'blankets'>('water');
  const [supplyAmount, setSupplyAmount] = useState(200);
  const [supplyRecommendation, setSupplyRecommendation] = useState<{
    warehouse: Warehouse;
    truck: Vehicle;
    distanceKm: number;
    etaMinutes: number;
    priority: string;
  } | null>(null);

  // Auto-calculate supply dispatch recommendation
  const handleCalculateSupply = () => {
    const shelter = shelters.find((s) => s.id === selectedShelterId);
    if (!shelter) return;

    // Convert supply type string for stock checking
    const warehouseKey = supplyType === 'food' ? 'food' : supplyType === 'water' ? 'water' : supplyType === 'medicine' ? 'medicine' : 'blankets';
    
    // Rank warehouses
    const warehouseRankings = rankWarehousesForSupply(shelter.location, warehouseKey, supplyAmount, warehouses);
    if (warehouseRankings.length === 0 || warehouseRankings[0].availableStock < supplyAmount) {
      addNotification(`ALERT: Insufficient global warehouse stock for ${supplyAmount} units of ${supplyType}.`, 'warning');
      return;
    }

    const bestWh = warehouseRankings[0].warehouse;
    
    // Find an idle supply truck
    const idleTruck = vehicles.find((v) => v.type === 'Supply Truck' && v.status === 'Idle');
    if (!idleTruck) {
      addNotification('ALERT: No idle Supply Trucks available. Postponing supply chain execution.', 'warning');
      return;
    }

    setSupplyRecommendation({
      warehouse: bestWh,
      truck: idleTruck,
      distanceKm: warehouseRankings[0].distanceKm,
      etaMinutes: warehouseRankings[0].etaMinutes,
      priority: shelter.waterSupply < 50 || shelter.foodSupply < 50 ? 'CRITICAL / DEPRIVED' : 'ROUTINE replenishment'
    });
  };

  const handleExecuteSupply = () => {
    if (!supplyRecommendation) return;
    const { truck, warehouse, priority } = supplyRecommendation;
    
    // Simulate logistics dispatch
    onDispatchVehicle(truck.id, selectedShelterId); // Dispatch truck to shelter location
    
    addNotification(
      `LOGISTICS DISPATCHED: ${truck.name} departing from ${warehouse.name} to deliver ${supplyAmount} units of ${supplyType} to ${shelters.find(s => s.id === selectedShelterId)?.name}. Priority level: ${priority}.`,
      'success'
    );
    
    setSupplyRecommendation(null);
    setSelectedShelterId('');
  };

  // Get active recommendations for selected incident
  const recommendations = selectedIncident
    ? recommendVehiclesForIncident(selectedIncident, vehicles, hazards, roadClosures)
    : [];

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-white/10 text-xs font-mono">
        <button
          onClick={() => setPlannerTab('dispatch')}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 transition ${
            plannerTab === 'dispatch'
              ? 'border-cyan-400 text-cyan-400 font-bold bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>TACTICAL DISPATCHER</span>
        </button>
        <button
          onClick={() => setPlannerTab('fleet')}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 transition ${
            plannerTab === 'fleet'
              ? 'border-cyan-400 text-cyan-400 font-bold bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>VEHICLE OPTIMIZER</span>
        </button>
        <button
          onClick={() => setPlannerTab('supplies')}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 transition ${
            plannerTab === 'supplies'
              ? 'border-cyan-400 text-cyan-400 font-bold bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>SUPPLY CHAIN LOGISTICS</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {/* Tab 1: Dispatcher */}
        {plannerTab === 'dispatch' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* List of active incidents */}
            <div className="glass-panel p-4 rounded-xl flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {selectedCategory === 'Police SOS' ? '👮 POLICE SOS QUEUE' : 'Active Emergency Tickets'}
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => onChangeCategory?.(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-slate-300 font-mono text-[9px] px-2 py-1 rounded cursor-pointer hover:border-cyan-500/50 transition outline-none"
                >
                  {[
                    'Disasters',
                    'Police SOS',
                    'All',
                    'Disaster Response',
                    'Public Safety',
                    'Animal Rescue',
                    'Veterinary Services',
                    'Infrastructure Issues',
                    'Utility Failures',
                    'Environmental Hazards'
                  ].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {incidents.filter((inc) => inc.status !== 'Resolved').length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                    ALL HAZARD SCENES REPORTED SECURED
                  </div>
                ) : (
                  incidents
                    .filter((inc) => inc.status !== 'Resolved')
                    .map((inc) => {
                      const isSelected = selectedIncident?.id === inc.id;
                      return (
                        <button
                          key={inc.id}
                          onClick={() => onSelectIncident(inc)}
                          className={`w-full text-left p-3 rounded-lg border font-mono transition flex justify-between items-center relative overflow-hidden ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.18)] ring-1 ring-cyan-400/30'
                              : 'bg-white/5 border-white/5 hover:border-slate-700'
                          }`}
                        >
                          {inc.needsSOSValidation ? (
                            <div className="absolute top-0 right-0 bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-bl text-[6px] uppercase tracking-widest animate-pulse flex items-center gap-1 z-10">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              Unverified SOS
                            </div>
                          ) : isSelected ? (
                            <div className="absolute top-0 right-0 bg-cyan-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded-bl text-[7px] uppercase tracking-wider animate-pulse">
                              AI Activated
                            </div>
                          ) : null}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-emergency-red animate-pulse"></span>
                              <span className="text-xs font-bold uppercase text-white">{inc.type}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{inc.description}</p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className="text-orange-400 text-xs font-extrabold">{inc.severity}%</span>
                            <div className="text-[9px] px-1 bg-white/10 rounded text-slate-400 uppercase">{inc.status}</div>
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            {/* AI Recommendation Panel */}
            <div className="glass-panel p-4 rounded-xl flex flex-col">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">AI Rescue Coordinator Recommendation</span>
              
              {!selectedIncident ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <Compass className="w-8 h-8 text-slate-700 mb-2 animate-spin" />
                  <p className="text-[11px] text-slate-500 font-mono uppercase">Dispatcher Standby</p>
                  <p className="text-[9px] text-slate-600 font-mono mt-0.5">Select a crisis incident on the left to initialize AI routing.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between font-mono">
                  <div className="space-y-3">
                    <div className="bg-black/30 border border-white/5 p-3 rounded-lg space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-400 font-bold uppercase">{selectedIncident.type} Scene</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/40 text-cyan-300 text-[8px] font-bold uppercase tracking-wider">
                          {selectedIncident.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 italic">&quot;{selectedIncident.description}&quot;</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-white/5 pt-2">
                        <div className="text-slate-400">Severity Profile: <span className="text-white font-bold">{selectedIncident.severity}/100</span></div>
                        <div className="text-slate-400">Status: <span className="text-orange-400 font-bold uppercase">{selectedIncident.status}</span></div>
                      </div>

                      {/* SOS Verification Widget */}
                      {selectedIncident.needsSOSValidation && (
                        <div className="bg-red-950/40 border border-red-500/30 p-2.5 rounded mt-2 space-y-2">
                          <div className="flex items-center space-x-2 text-red-400 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[10px]">UNVERIFIED CITIZEN SOS SIGNAL</span>
                          </div>
                          <p className="text-[9px] text-slate-300">
                            This emergency request was broadcasted by a citizen and requires human verification prior to dispatch.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const verified = {
                                  ...selectedIncident,
                                  needsSOSValidation: false,
                                  status: 'Reported' as const
                                };
                                addNotification(`SOS VERIFIED: Crisis scene registered at coordinate location.`, 'success');
                                onUpdateIncident?.(verified);
                              }}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] font-bold rounded uppercase tracking-wider transition"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => {
                                const dismissed = {
                                  ...selectedIncident,
                                  needsSOSValidation: false,
                                  status: 'Resolved' as const
                                };
                                addNotification(`SOS DISMISSED: SOS report marked as resolved/spam.`, 'warning');
                                onUpdateIncident?.(dismissed);
                                onSelectIncident(null);
                              }}
                              className="flex-1 py-1 bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-[9px] font-bold rounded uppercase tracking-wider transition"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 0. Custom Police SOS Telemetry & Status Tracker */}
                      {selectedIncident.type === 'POLICE_SOS' && (
                        <div className="bg-blue-950/20 border border-blue-800/20 p-2.5 rounded space-y-2 mt-2 font-sans">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-blue-400 font-bold">👮 POLICE EMERGENCY SOS DESK</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-bold text-[8px]">
                              POLICE ONLY
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-slate-300 space-y-1">
                            <div><strong>Incident:</strong> Police Assistance SOS</div>
                            <div><strong>Reporter:</strong> {selectedIncident.reporter}</div>
                            <div><strong>User Name:</strong> Citizen (Verified GPS lock)</div>
                            <div><strong>Phone:</strong> +91 98765 43210 (Verified)</div>
                            <div><strong>Time Reported:</strong> {selectedIncident.reportedAt}</div>
                            <div><strong>Current Status:</strong> <span className="text-blue-400 font-bold uppercase">{selectedIncident.status}</span></div>
                          </div>

                          {/* SOS Status Progress Tracker */}
                          <div className="py-2 border-t border-white/5 border-b border-white/5 mt-2">
                            <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">Police response lifecycle</div>
                            <div className="flex justify-between items-center relative py-1 px-3">
                              {[
                                { label: 'SOS Sent', match: ['Pending', 'SOS Sent', 'Police Notified', 'Police Responding', 'Resolved'] },
                                { label: 'Notified', match: ['Police Notified', 'Police Responding', 'Resolved'] },
                                { label: 'Responding', match: ['Police Responding', 'Resolved'] },
                                { label: 'Resolved', match: ['Resolved'] }
                              ].map((step, idx) => {
                                const isCompleted = step.match.includes(selectedIncident.status);
                                const isActive = selectedIncident.status === step.label || 
                                  (step.label === 'SOS Sent' && selectedIncident.status === 'Pending') ||
                                  (step.label === 'Notified' && selectedIncident.status === 'Police Notified') ||
                                  (step.label === 'Responding' && selectedIncident.status === 'Police Responding');
                                return (
                                  <div key={idx} className="flex flex-col items-center flex-1 z-10">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                                      isCompleted 
                                        ? 'bg-blue-950 border-blue-500 text-blue-400' 
                                        : 'bg-zinc-955 border-white/5 text-slate-600'
                                    } ${isActive ? 'animate-pulse ring-1 ring-blue-500/30' : ''}`}>
                                      {idx + 1}
                                    </div>
                                    <span className={`text-[7px] mt-1 font-bold uppercase tracking-tighter ${isCompleted ? 'text-blue-400' : 'text-slate-600'}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                              {/* Connector line */}
                              <div className="absolute top-3 left-6 right-6 h-[1.5px] bg-white/5 -z-0"></div>
                            </div>
                          </div>

                          {/* Police Status Update Actions */}
                          <div className="pt-2 flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...selectedIncident, status: 'Police Notified' as const };
                                addNotification(`POLICE DISPATCH: Police notified of SOS ${selectedIncident.id}.`, 'info');
                                onUpdateIncident?.(updated);
                              }}
                              className="px-2 py-1 rounded bg-blue-950 border border-blue-800/40 hover:border-blue-400 text-[8px] font-bold text-blue-300 hover:text-white transition cursor-pointer"
                            >
                              Notify Police
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...selectedIncident, status: 'Police Responding' as const };
                                addNotification(`POLICE DISPATCH: Officers responding to SOS ${selectedIncident.id}.`, 'emergency');
                                onUpdateIncident?.(updated);
                              }}
                              className="px-2 py-1 rounded bg-blue-950 border border-blue-800/40 hover:border-blue-400 text-[8px] font-bold text-blue-300 hover:text-white transition cursor-pointer"
                            >
                              Set Responding
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...selectedIncident, status: 'Resolved' as const };
                                addNotification(`POLICE DISPATCH: SOS ${selectedIncident.id} resolved. Scene secured.`, 'success');
                                onUpdateIncident?.(updated);
                              }}
                              className="px-2 py-1 rounded bg-emerald-950 border border-emerald-800/40 hover:border-emerald-400 text-[8px] font-bold text-emerald-300 hover:text-white transition cursor-pointer"
                            >
                              Set Resolved
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 1. Custom Snake Sighting Telemetry & Status Tracker */}
                      {selectedIncident.type === 'Snake Sighting' && selectedIncident.snakeDetails && (
                        <div className="bg-emerald-950/20 border border-emerald-800/20 p-2.5 rounded space-y-2 mt-2 font-sans">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-emerald-400 font-bold">🐍 SNAKE RESCUE PROFILE</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 font-bold text-[8px]">
                              {selectedIncident.snakeDetails.environment}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300">
                            <strong>Urgency:</strong> {selectedIncident.snakeDetails.urgency}<br />
                            <strong>Advice:</strong> {selectedIncident.snakeDetails.recommendation}
                          </div>
                          
                          {/* Live Status Tracker reported -> team assigned -> en route -> rescued -> closed */}
                          <div className="pt-2">
                            <div className="text-[8px] text-slate-500 uppercase tracking-widest font-mono mb-1">Rescue Staging Tracker</div>
                            <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono relative">
                              {['Reported', 'Team Assigned', 'En Route', 'Rescued', 'Closed'].map((step, idx) => {
                                const currentStatus = selectedIncident.status;
                                const statusMap = ['Reported', 'Team Assigned', 'En Route', 'Rescued', 'Closed'];
                                const activeIdx = statusMap.indexOf(currentStatus);
                                const isPassed = statusMap.indexOf(step) <= (activeIdx === -1 ? 0 : activeIdx);
                                return (
                                  <div key={step} className="flex flex-col items-center flex-1 z-10">
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[7px] font-bold ${
                                      isPassed 
                                        ? 'bg-emerald-500 border-emerald-400 text-black' 
                                        : 'bg-zinc-950 border-white/10 text-slate-500'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                    <span className={`mt-1 scale-[0.9] origin-top whitespace-nowrap ${isPassed ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>{step}</span>
                                  </div>
                                );
                              })}
                              {/* Connector line */}
                              <div className="absolute top-1.5 left-6 right-6 h-[1.5px] bg-white/5 -z-0"></div>
                            </div>
                          </div>
                          
                          {/* Administration update buttons */}
                          <div className="pt-2 flex flex-wrap gap-1 border-t border-white/5 pt-2">
                            {['Team Assigned', 'En Route', 'Rescued', 'Closed'].map((nxtStatus) => (
                              <button
                                key={nxtStatus}
                                onClick={() => {
                                  const updated = {
                                    ...selectedIncident,
                                    status: nxtStatus as Incident['status']
                                  };
                                  addNotification(`STATUS UPDATE: Snake Sighting incident ${selectedIncident.id} updated to ${nxtStatus}.`, 'info');
                                  onUpdateIncident?.(updated);
                                }}
                                className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-[8px] text-slate-300 transition"
                              >
                                Set {nxtStatus}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Veterinary and Animal Rescue Details */}
                      {(selectedIncident.category === 'Veterinary Services' || selectedIncident.type === 'Wild Animal Rescue') && selectedIncident.animalRescueDetails && (
                        <div className="bg-amber-950/20 border border-amber-800/20 p-2.5 rounded space-y-1.5 mt-2 font-sans text-[10px]">
                          <div className="text-amber-400 font-bold">🐾 ANIMAL WELFARE RECORD</div>
                          <div className="text-slate-300">
                            <strong>Animal:</strong> {selectedIncident.animalRescueDetails.animalType}<br />
                            <strong>Condition:</strong> {selectedIncident.animalRescueDetails.condition}<br />
                            <strong>Route:</strong> {selectedIncident.animalRescueDetails.recommendation}<br />
                            <strong>Summary:</strong> {selectedIncident.animalRescueDetails.summary}
                          </div>
                          {/* Action update buttons */}
                          <div className="pt-2 flex flex-wrap gap-1 border-t border-white/5 pt-2">
                            {['Dispatched', 'Active', 'Resolved'].map((nxtStatus) => (
                              <button
                                key={nxtStatus}
                                onClick={() => {
                                  const updated = {
                                    ...selectedIncident,
                                    status: nxtStatus as Incident['status']
                                  };
                                  addNotification(`STATUS UPDATE: Animal rescue incident ${selectedIncident.id} updated to ${nxtStatus}.`, 'info');
                                  onUpdateIncident?.(updated);
                                }}
                                className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-[8px] text-slate-300 transition"
                              >
                                Set {nxtStatus}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Public Safety & Civic Infrastructure Details */}
                      {selectedIncident.civicDetails && (
                        <div className="bg-cyan-950/20 border border-cyan-800/20 p-2.5 rounded space-y-1.5 mt-2 font-sans text-[10px]">
                          <div className="text-cyan-400 font-bold">🏢 CIVIC SERVICE ROUTING</div>
                          <div className="text-slate-300">
                            <strong>Department:</strong> {selectedIncident.civicDetails.recommendedDepartment}<br />
                            <strong>Log:</strong> {selectedIncident.civicDetails.reportSummary}
                          </div>
                          {/* Action update buttons */}
                          <div className="pt-2 flex flex-wrap gap-1 border-t border-white/5 pt-2">
                            {['Dispatched', 'Active', 'Resolved'].map((nxtStatus) => (
                              <button
                                key={nxtStatus}
                                onClick={() => {
                                  const updated = {
                                    ...selectedIncident,
                                    status: nxtStatus as Incident['status']
                                  };
                                  addNotification(`STATUS UPDATE: Civic incident ${selectedIncident.id} updated to ${nxtStatus}.`, 'info');
                                  onUpdateIncident?.(updated);
                                }}
                                className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-[8px] text-slate-300 transition"
                              >
                                Set {nxtStatus}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Base required resources */}
                      <div className="text-slate-400 text-[10px] border-t border-white/5 pt-2">
                        Required units: <span className="text-orange-300 font-bold">{selectedIncident.requiredResources.join(', ')}</span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 uppercase">Available Vehicles & Routing Score</span>
                    
                    <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                      {recommendations.length === 0 ? (
                        <div className="text-slate-600 text-xs">NO DEPLOYABLE VEHICLES FOUND IN BASE</div>
                      ) : (
                        recommendations.map((rec) => (
                          <div
                            key={rec.vehicle.id}
                            className="bg-white/5 border border-white/5 p-2 rounded-lg flex justify-between items-center text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-white">{rec.vehicle.name}</div>
                              <div className="text-[10px] text-slate-400">
                                Type: {rec.vehicle.type} | ETA: <span className="text-cyan-300">{rec.etaMinutes} mins</span> ({rec.distanceKm} km)
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                rec.compatibilityScore > 80 ? 'bg-emerald-950 text-emerald-300' : 'bg-orange-950 text-orange-400'
                              }`}>
                                {rec.compatibilityScore}% Match
                              </span>
                              <button
                                onClick={() => {
                                  onDispatchVehicle(rec.vehicle.id, selectedIncident.id);
                                  onSelectIncident(null);
                                }}
                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold rounded text-[10px] transition"
                              >
                                DISPATCH
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Vehicle Optimizer */}
        {plannerTab === 'fleet' && (
          <div className="glass-panel p-4 rounded-xl h-full flex flex-col min-h-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3">Emergency Response Fleet Status</span>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 flex flex-col">
              {/* List Header */}
              <div className="flex justify-between items-center text-slate-500 font-mono text-[9px] uppercase tracking-wider pb-2 border-b border-white/10 px-3 flex-shrink-0">
                <div className="w-[35%]">Vehicle Unit</div>
                <div className="w-[15%] text-center">Status</div>
                <div className="w-[15%] text-center">Fuel</div>
                <div className="w-[15%] text-center">Speed</div>
                <div className="w-[20%] text-right">Logistics</div>
              </div>

              {/* List Body */}
              <div className="space-y-1.5 pt-1.5 flex-1 overflow-y-auto pr-1">
                {vehicles.map((v) => {
                  const isSelected = selectedVehicle?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (onSelectVehicle) {
                          onSelectVehicle(v);
                          // Deselect active incident so map focuses on vehicle
                          onSelectIncident(null);
                        }
                      }}
                      className={`flex justify-between items-center bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-xl p-3 cursor-pointer transition-all duration-200 font-mono text-xs ${
                        isSelected ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]' : ''
                      }`}
                    >
                      <div className="w-[35%] min-w-0 pr-2">
                        <div className="font-bold text-white truncate text-[11px]">{v.name}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5 truncate">{v.type}</div>
                      </div>
                      
                      <div className="w-[15%] flex justify-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          v.status === 'Idle' ? 'bg-slate-800/80 text-slate-400 border border-slate-700/30' :
                          v.status === 'EnRoute' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/30' :
                          'bg-emerald-950/80 text-emerald-300 border border-emerald-800/30'
                        }`}>
                          {v.status === 'EnRoute' ? 'En Route' : v.status}
                        </span>
                      </div>
                      
                      <div className="w-[15%] flex items-center justify-center space-x-1">
                        <Battery className={`w-3.5 h-3.5 ${v.fuel < 20 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                        <span className={`text-[10px] ${v.fuel < 20 ? 'text-red-500 font-bold' : 'text-slate-200'}`}>
                          {v.fuel.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-[15%] text-center">
                        <span className={`text-[10px] font-bold ${v.speed > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {v.speed > 0 ? `${v.speed} km/h` : 'STATIONARY'}
                        </span>
                      </div>
                      
                      <div className="w-[20%] text-right truncate pl-2">
                        {v.activeIncidentId ? (
                          <span className="text-amber-400 font-bold text-[10px] animate-pulse">
                            inc-{v.activeIncidentId.split('-')[1] || v.activeIncidentId}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">{v.equipment[0] || 'Standard Kit'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Supply Chain */}
        {plannerTab === 'supplies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Delivery Dispatch Form */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-3">Optimize Supply Dispatch Cargo</span>
                
                <div className="space-y-4">
                  {/* Select Destination Shelter */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Target Evacuation Shelter</label>
                    <select
                      value={selectedShelterId}
                      onChange={(e) => {
                        setSelectedShelterId(e.target.value);
                        setSupplyRecommendation(null);
                      }}
                      className="w-full bg-cyber-dark border border-white/10 rounded px-2.5 py-1.5 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select shelter destination...</option>
                      {shelters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Occupancy: {Math.round((s.occupied / s.capacity) * 100)}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supply Type & Quantity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Resource Commodity</label>
                      <select
                        value={supplyType}
                        onChange={(e) => {
                          setSupplyType(e.target.value as 'food' | 'water' | 'medicine' | 'blankets');
                          setSupplyRecommendation(null);
                        }}
                        className="w-full bg-cyber-dark border border-white/10 rounded px-2.5 py-1.5 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="water">Potable Water</option>
                        <option value="food">Rations Food</option>
                        <option value="medicine">Vaccines/Meds</option>
                        <option value="blankets">Thermal Blankets</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Quantity Units</label>
                      <input
                        type="number"
                        value={supplyAmount}
                        onChange={(e) => {
                          setSupplyAmount(Number(e.target.value));
                          setSupplyRecommendation(null);
                        }}
                        className="w-full bg-cyber-dark border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCalculateSupply}
                disabled={!selectedShelterId || supplyAmount <= 0}
                className="w-full mt-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold rounded text-xs transition"
              >
                CALCULATE OPTIMAL LOGISTICS PATH
              </button>
            </div>

            {/* AI Optimization Results */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-3">AI Logistics Solution Engine</span>
                
                {!supplyRecommendation ? (
                  <div className="flex-grow flex flex-col items-center justify-center py-10 text-center text-slate-600 text-xs">
                    <Truck className="w-8 h-8 mb-2 animate-bounce" />
                    STANDBY. CALCULATE SHIPMENT CRITERIA.
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-lg flex items-start space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-300">Optimal Solution Discovered</p>
                        <p className="text-[10px] text-slate-300 leading-tight">
                          The system selected the Medchal Depot due to current stocking vectors and highway routing safety ratios.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-black/30 p-3 rounded-lg border border-white/5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Dispatch Node:</span>
                        <span className="text-white font-semibold">{supplyRecommendation.warehouse.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Cargo Vehicle:</span>
                        <span className="text-white font-semibold">{supplyRecommendation.truck.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Transit Distance:</span>
                        <span className="text-cyan-300 font-semibold">{supplyRecommendation.distanceKm} km</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Estimated Arrival:</span>
                        <span className="text-cyan-300 font-semibold">{supplyRecommendation.etaMinutes} mins</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Fulfill Urgency:</span>
                        <span className="text-orange-400 font-bold uppercase">{supplyRecommendation.priority}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {supplyRecommendation && (
                <button
                  onClick={handleExecuteSupply}
                  className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold rounded text-xs transition"
                >
                  EXECUTE LOGISTICS SHIPMENT
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
