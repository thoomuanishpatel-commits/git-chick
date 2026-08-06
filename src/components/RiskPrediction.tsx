'use client';

import { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  Flame, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  Users, 
  Hospital as HospitalIcon, 
  Home as ShelterIcon, 
  CheckCircle2, 
  XCircle,
  Clock,
  Wrench,
  CornerDownRight,
  TrendingDown
} from 'lucide-react';
import { Incident, Hospital, Shelter, Location } from '../utils/mockData';

interface RiskPredictionProps {
  incidents: Incident[];
  shelters: Shelter[];
  hospitals: Hospital[];
  hospOccupancy: number;
  simulationHour: number;
  forecastHours: number;
  setForecastHours: (hours: number) => void;
}

export default function RiskPrediction({
  incidents,
  shelters,
  hospitals,
  simulationHour,
  forecastHours,
  setForecastHours,
}: RiskPredictionProps) {
  
  // Calculate average active incident severity for threat factor
  const activeIncidents = useMemo(() => incidents.filter(i => i.status !== 'Resolved'), [incidents]);
  const baseSeverity = useMemo(() => {
    if (activeIncidents.length === 0) return 0;
    return activeIncidents.reduce((sum, inc) => sum + inc.severity, 0) / activeIncidents.length;
  }, [activeIncidents]);

  const activeFloodsCount = useMemo(() => activeIncidents.filter(i => i.type === 'Flood').length, [activeIncidents]);
  const activeFiresCount = useMemo(() => activeIncidents.filter(i => i.type === 'Fire').length, [activeIncidents]);
  const activeLandslidesCount = useMemo(() => activeIncidents.filter(i => i.type === 'Landslide').length, [activeIncidents]);

  // AI PREDICTION COMPUTED VALUES
  const aiPredictions = useMemo(() => {
    const hoursFactor = forecastHours / 24;
    const severityFactor = baseSeverity / 50;

    // 1. Severity escalation
    const severityTrend = Math.min(100, Math.round(baseSeverity + (forecastHours * 0.45 * (activeFloodsCount + activeFiresCount + 1))));
    
    // 2. Population at risk
    const basePop = activeIncidents.length * 1800;
    const popRisk = Math.round(basePop * (1 + forecastHours * 0.09 * (severityFactor + 0.5)));

    // 3. Estimated casualties
    const baseCasualties = activeIncidents.reduce((sum, inc) => sum + (inc.casualtyEstimate || 0), 0);
    const casualties = Math.round(baseCasualties + (forecastHours * 0.45 * (severityFactor + 0.5)));

    // 4. Evac Areas
    const evacSectors: string[] = [];
    if (forecastHours > 0) {
      if (activeFloodsCount > 0) evacSectors.push('Musi Riverbed low-lying settlements');
      if (activeFiresCount > 0) evacSectors.push('Jeedimetla Industrial Buffer Zone');
    }
    if (forecastHours >= 12) {
      if (activeFloodsCount > 0) evacSectors.push('Chaderghat Bridge exit lanes');
      evacSectors.push('Begumpet Airport low underpass sectors');
    }
    if (forecastHours >= 24) {
      evacSectors.push('Vikarabad Ghat Hairpin valley routes');
    }
    if (evacSectors.length === 0) {
      evacSectors.push('None - Standard Monitoring');
    }

    // 5. Shortages
    const shortages: string[] = [];
    if (forecastHours >= 6 && activeIncidents.length > 3) {
      shortages.push('ICU Space (NIMS & Osmania)');
    }
    if (forecastHours >= 12) {
      shortages.push('High-Water Rescue Rafts');
      shortages.push('Foam Suppression Tenders');
    }
    if (forecastHours >= 24) {
      shortages.push('Portable Diesel Generators');
      shortages.push('Shelter Medical Kits');
    }
    if (shortages.length === 0) {
      shortages.push('None - Adequate Reserval Units');
    }

    // 6. Action Directives
    const actions: string[] = [];
    if (forecastHours === 0) {
      actions.push('Establish perimeter blockages around Musi River and Jeedimetla.');
      actions.push('Pre-stage rescue speedboats at Chadarghat station.');
    } else if (forecastHours < 12) {
      actions.push('Initiate Stage 1 voluntary evacuation of Musi basin.');
      actions.push('Restrict Begumpet runway taxi movements.');
    } else if (forecastHours < 24) {
      actions.push('Command mandatory evacuation for sectors near Musi riverbed.');
      actions.push('Execute grid load shedding in Jeedimetla to prevent fire spreads.');
    } else {
      actions.push('Mobilize NDRF reserves from outlying base stations.');
      actions.push('Set up Forward Triage Centers at Begumpet.');
    }

    return {
      severityTrend,
      popRisk,
      casualties,
      rescueRequirement: `${Math.ceil(activeIncidents.length * 1.5 * (1 + hoursFactor * 0.3))} SDRF Teams, ${Math.ceil(activeFloodsCount * 2 * (1 + hoursFactor * 0.5))} Boats`,
      medicalDemand: `${Math.ceil(casualties * 2.2 + 5)} Emergency cases, ${Math.ceil(casualties * 0.5 + 2)} ICU Beds`,
      supplyDemand: `${(hoursFactor * 1.5 + 0.5).toFixed(1)} Tons food packs, ${(hoursFactor * 2.5 + 1).toFixed(1)} KL potable water`,
      evacSectors,
      shortages,
      actions
    };
  }, [forecastHours, baseSeverity, activeIncidents, activeFloodsCount, activeFiresCount]);

  // HOSPITAL DYNAMIC PROJECTIONS
  const hospitalForecasts = useMemo(() => {
    return hospitals.map((h) => {
      // Inflow rate based on incident severity
      const inflowRate = (baseSeverity / 65) * (h.totalBeds / 45); 
      const addedPatients = Math.round(inflowRate * forecastHours);
      
      const currentOcc = h.occupiedBeds;
      const predictedOcc = Math.min(Math.round(h.totalBeds * 1.35), currentOcc + addedPatients);
      const occupancyPercent = Math.round((predictedOcc / h.totalBeds) * 100);
      const availableBeds = Math.max(0, h.totalBeds - predictedOcc);
      
      // ICU math (15% baseline total beds)
      const icuTotal = Math.round(h.totalBeds * 0.15);
      const baseIcuOcc = Math.round(h.occupiedBeds * 0.15);
      const predictedIcuOcc = Math.min(icuTotal, baseIcuOcc + Math.round(addedPatients * 0.25));
      const icuAvailable = Math.max(0, icuTotal - predictedIcuOcc);
      
      // Triage expand capacity
      const emergencyCapacity = Math.round(h.totalBeds * 1.3);

      // Overload time
      let overloadTime = 'Stable (>48h)';
      if (h.totalBeds > currentOcc && inflowRate > 0) {
        const hoursToOverload = (h.totalBeds - currentOcc) / inflowRate;
        if (hoursToOverload <= forecastHours) {
          overloadTime = 'OVERLOADED';
        } else if (hoursToOverload <= 48) {
          overloadTime = `${Math.round(hoursToOverload)}h`;
        }
      } else if (currentOcc >= h.totalBeds) {
        overloadTime = 'Immediate';
      }

      // Risk level
      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (occupancyPercent >= 100) risk = 'Critical';
      else if (occupancyPercent >= 85) risk = 'High';
      else if (occupancyPercent >= 65) risk = 'Medium';

      return {
        ...h,
        predictedOcc,
        occupancyPercent,
        availableBeds,
        icuAvailable,
        emergencyCapacity,
        overloadTime,
        risk
      };
    });
  }, [hospitals, baseSeverity, forecastHours]);

  // SHELTER DYNAMIC PROJECTIONS
  const shelterForecasts = useMemo(() => {
    return shelters.map((s) => {
      // Inevitable evacuees inflow
      const evacueeInflowRate = (baseSeverity / 50) * 14 * (s.capacity / 600);
      const addedEvacuees = Math.round(evacueeInflowRate * forecastHours);
      
      const currentOcc = s.occupied;
      const predictedOcc = Math.min(Math.round(s.capacity * 1.25), currentOcc + addedEvacuees);
      const remaining = Math.max(0, s.capacity - predictedOcc);
      const occupancyPercent = Math.round((predictedOcc / s.capacity) * 100);

      // Resource degradation model
      const usageMultiplier = 1 + (predictedOcc / s.capacity) * 0.8;
      const foodLeft = Math.max(0, Math.round(s.foodSupply - (forecastHours * 1.8 * usageMultiplier)));
      const waterLeft = Math.max(0, Math.round(s.waterSupply - (forecastHours * 2.2 * usageMultiplier)));
      const medLeft = Math.max(0, Math.round(s.medicalSupply - (forecastHours * 1.4 * usageMultiplier)));

      // Time until full
      let timeUntilFull = 'Stable (>48h)';
      if (s.capacity > currentOcc && evacueeInflowRate > 0) {
        const hoursToFull = (s.capacity - currentOcc) / evacueeInflowRate;
        if (hoursToFull <= forecastHours) {
          timeUntilFull = 'FULL';
        } else if (hoursToFull <= 48) {
          timeUntilFull = `${Math.round(hoursToFull)}h`;
        }
      } else if (currentOcc >= s.capacity) {
        timeUntilFull = 'Immediate';
      }

      // Risk level
      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (occupancyPercent >= 100 || waterLeft <= 10 || foodLeft <= 10) risk = 'Critical';
      else if (occupancyPercent >= 80 || waterLeft <= 35 || foodLeft <= 35) risk = 'High';
      else if (occupancyPercent >= 55) risk = 'Medium';

      return {
        ...s,
        predictedOcc,
        remaining,
        occupancyPercent,
        foodLeft,
        waterLeft,
        medLeft,
        timeUntilFull,
        risk
      };
    });
  }, [shelters, baseSeverity, forecastHours]);

  // DYNAMIC CRITICAL INFRASTRUCTURE FAILURE PROJECTIONS
  const infrastructureForecasts = useMemo(() => {
    const list = [
      { 
        name: 'Musi Chaderghat Bridge', 
        type: 'Bridge', 
        baselineRisk: 12, 
        cause: 'Musi River rising flow stress', 
        rec: 'Divert heavy traffic; install water height gauge',
        affectedBy: activeFloodsCount
      },
      { 
        name: 'Begumpet Runway Drainage Gate', 
        type: 'Airport', 
        baselineRisk: 18, 
        cause: 'Storm run-off sewer backlog', 
        rec: 'Pre-stage high capacity pump nodes',
        affectedBy: activeFloodsCount
      },
      { 
        name: 'Osman Sagar Emergency Gates', 
        type: 'Dam', 
        baselineRisk: 22, 
        cause: 'Inflow rate exceeding volume capacity', 
        rec: 'Execute controlled 200 cusecs release',
        affectedBy: activeFloodsCount
      },
      { 
        name: 'Musi Crossing MGBS Metro Pillar', 
        type: 'Metro lines', 
        baselineRisk: 8, 
        cause: 'Soil erosion by flooding scour', 
        rec: 'Slow metro speeds to 20km/h over crossing',
        affectedBy: activeFloodsCount
      },
      { 
        name: 'Jeedimetla Power Substation 4', 
        type: 'Power station', 
        baselineRisk: 14, 
        cause: 'Thermal overload and plume buffer hazard', 
        rec: 'Isolate Sector 4 lines; load shed adjacent grids',
        affectedBy: activeFiresCount
      },
      { 
        name: 'Vikarabad Sector Comm Mast', 
        type: 'Communication tower', 
        baselineRisk: 10, 
        cause: 'Soil moisture displacement & heavy wind', 
        rec: 'Prepare portable satellite antenna trailers',
        affectedBy: activeLandslidesCount
      },
      { 
        name: 'Singur Reservoir Catchment', 
        type: 'Reservoir', 
        baselineRisk: 15, 
        cause: 'Tributary inflow spike', 
        rec: 'Monitor silt sensors; coordinate irrigation dept',
        affectedBy: activeFloodsCount
      },
      { 
        name: 'Amberpet Water Filtration Node', 
        type: 'Water treatment plant', 
        baselineRisk: 9, 
        cause: 'Silt overload by Musi overflow', 
        rec: 'Initiate coagulant treatment bypass',
        affectedBy: activeFloodsCount
      },
      { 
        name: 'NH-65 Low-Lying Underpass', 
        type: 'Highway', 
        baselineRisk: 16, 
        cause: 'Flash flooding runoff collection', 
        rec: 'Set up automated highway barricades',
        affectedBy: activeFloodsCount
      }
    ];

    return list.map((item) => {
      const activeFactor = item.affectedBy > 0 ? 2.5 : 1.0;
      const hoursMultiplier = forecastHours > 0 ? 1 + (forecastHours * 0.12 * activeFactor) : 1;
      
      const prob = Math.min(100, Math.round(item.baselineRisk * hoursMultiplier));
      
      let status = 'Operational';
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      let hoursToFailure = 'N/A';

      if (prob >= 90) {
        status = 'Failing';
        riskLevel = 'Critical';
        hoursToFailure = 'Immediate';
      } else if (prob >= 70) {
        status = 'Compromised';
        riskLevel = 'High';
        const estTime = Math.max(1, Math.round((90 - prob) / 1.5));
        hoursToFailure = `${estTime}h`;
      } else if (prob >= 40) {
        status = 'Warning Alert';
        riskLevel = 'Medium';
        const estTime = Math.round((90 - prob) / 1.2);
        hoursToFailure = `${estTime}h`;
      }

      return {
        ...item,
        probability: prob,
        status,
        riskLevel,
        hoursToFailure
      };
    });
  }, [forecastHours, activeFloodsCount, activeFiresCount, activeLandslidesCount]);

  return (
    <div className="w-full h-full flex flex-col space-y-4 font-mono text-xs text-slate-300">
      
      {/* 1. Forecasting Control HUD */}
      <div className="glass-panel p-4 rounded-xl space-y-3 shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-500/10">
        <div className="flex justify-between items-center text-cyan-400">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 animate-pulse text-cyan-400" />
            <span className="font-bold uppercase tracking-wider text-xs">Predictive Threat Assessment Timeline</span>
          </div>
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40">
              ELAPSED SIM TIME: {simulationHour.toFixed(1)}h
            </span>
            <span className="bg-black/40 text-slate-400 px-2 py-0.5 rounded border border-white/5">
              TARGET RANGE: 48h
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Slide the prediction vector to simulate environmental degradation, fire spreads, and infrastructure saturation over the next 48 hours.
        </p>

        {/* Timeline Slider */}
        <div className="space-y-2 bg-black/40 border border-white/5 p-3.5 rounded-lg relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-cyan-500/20 via-transparent to-transparent" />
          <div className="flex justify-between text-[10px] text-slate-500 font-bold pb-1">
            <span className={forecastHours === 0 ? 'text-cyan-400' : ''}>NOW (0h)</span>
            <span className={forecastHours === 6 ? 'text-cyan-400' : ''}>+6h</span>
            <span className={forecastHours === 12 ? 'text-cyan-400' : ''}>+12h</span>
            <span className={forecastHours === 24 ? 'text-cyan-400' : ''}>+24h</span>
            <span className={forecastHours === 36 ? 'text-cyan-400' : ''}>+36h</span>
            <span className={forecastHours === 48 ? 'text-cyan-400' : ''}>+48h</span>
          </div>
          <input
            type="range"
            min="0"
            max="48"
            step="2"
            value={forecastHours}
            onChange={(e) => setForecastHours(Number(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer hover:bg-slate-700 transition"
          />
          <div className="flex justify-between items-center text-xs pt-1.5 font-bold">
            <span className="text-[10px] text-zinc-500">DYNAMIC TIME STEP DETOUR MODEL ACTIVE</span>
            <span className="text-cyan-400 uppercase tracking-widest text-xs">
              FORECAST CONTEXT: +{forecastHours} HOURS OUT
            </span>
          </div>
        </div>
      </div>

      {/* Main content split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        
        {/* Left Column: AI Predictions HUD */}
        <div className="glass-panel p-4 rounded-xl flex flex-col space-y-4 lg:col-span-1 border border-white/5 shadow-lg bg-black/20 min-h-0 overflow-y-auto">
          <div className="flex items-center space-x-1.5 text-purple-400 border-b border-white/5 pb-2 font-bold uppercase tracking-wider text-[10px]">
            <Cpu className="w-4 h-4 animate-pulse text-purple-400" />
            <span>AI Simulation Summary</span>
          </div>

          <div className="space-y-4">
            
            {/* Severity Meter */}
            <div className="space-y-1 bg-black/40 border border-white/5 p-2.5 rounded-lg">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
                <span>Disaster Severity Index</span>
                <span className="text-purple-400">{aiPredictions.severityTrend}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500" 
                  style={{ width: `${aiPredictions.severityTrend}%` }}
                />
              </div>
            </div>

            {/* Populations */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg space-y-0.5">
                <span className="text-[8px] text-slate-500 uppercase block font-bold">Pop. At Risk</span>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-red-400" />
                  <span>{aiPredictions.popRisk.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg space-y-0.5">
                <span className="text-[8px] text-slate-500 uppercase block font-bold">Est. Casualties</span>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                  <span className={aiPredictions.casualties > 0 ? 'text-red-400' : ''}>
                    {aiPredictions.casualties}
                  </span>
                </div>
              </div>
            </div>

            {/* Needs */}
            <div className="space-y-2 text-[10px] bg-black/40 border border-white/5 p-2.5 rounded-lg font-mono">
              <div className="text-[9px] text-slate-500 uppercase border-b border-white/5 pb-1 font-bold">Predicted Demands</div>
              <div className="space-y-1.5 pt-1">
                <div>🚒 Rescue: <span className="text-white block font-bold">{aiPredictions.rescueRequirement}</span></div>
                <div>🏥 Medical: <span className="text-white block font-bold">{aiPredictions.medicalDemand}</span></div>
                <div>🍞 Supplies: <span className="text-white block font-bold">{aiPredictions.supplyDemand}</span></div>
              </div>
            </div>

            {/* Evac zones */}
            <div className="space-y-1.5 text-[10px] bg-black/40 border border-white/5 p-2.5 rounded-lg">
              <div className="text-[9px] text-slate-500 uppercase border-b border-white/5 pb-1 font-bold">Evacuate Sectors</div>
              <ul className="space-y-1 pt-1 text-[9px] text-orange-400">
                {aiPredictions.evacSectors.map((sector, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>{sector}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Shortages */}
            <div className="space-y-1.5 text-[10px] bg-black/40 border border-white/5 p-2.5 rounded-lg">
              <div className="text-[9px] text-slate-500 uppercase border-b border-white/5 pb-1 font-bold">Supply Shortages</div>
              <ul className="space-y-1 pt-1 text-[9px] text-red-400">
                {aiPredictions.shortages.map((shortage, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{shortage}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Directives */}
            <div className="space-y-1.5 text-[10px] bg-black/40 border border-white/5 p-2.5 rounded-lg">
              <div className="text-[9px] text-slate-500 uppercase border-b border-white/5 pb-1 font-bold">AI Tactical Directives</div>
              <ul className="space-y-1 pt-1 text-[9px] text-slate-300">
                {aiPredictions.actions.map((act, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <CornerDownRight className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Right Columns: Hospitals, Shelters, Infrastructure */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-y-auto">
          
          {/* Hospital Saturation Forecast */}
          <div className="glass-panel p-4 rounded-xl flex flex-col min-h-[400px] border border-white/5">
            <div className="flex items-center space-x-1.5 text-cyan-400 border-b border-white/5 pb-2 mb-3">
              <HospitalIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] text-white uppercase tracking-wider font-bold">Hospital Forecast</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {hospitalForecasts.map((hp) => {
                const totalBeds = hp.totalBeds;
                const capacityPercent = hp.occupancyPercent;
                
                return (
                  <div key={hp.id} className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2 relative overflow-hidden transition hover:border-cyan-500/20">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-xs block leading-tight">{hp.name}</span>
                        <span className="text-[8px] text-slate-500 block uppercase">Telangana Health Node</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                        hp.risk === 'Critical' ? 'bg-red-950 text-red-400 border-red-500/30' :
                        hp.risk === 'High' ? 'bg-orange-950 text-orange-400 border-orange-500/30' :
                        hp.risk === 'Medium' ? 'bg-amber-950 text-amber-400 border-amber-500/30 animate-pulse' :
                        'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {hp.risk} Risk
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] text-slate-400 pt-1 font-mono">
                      <div>Occupancy: <span className="text-white block font-bold">{hp.predictedOcc} / {totalBeds} ({capacityPercent}%)</span></div>
                      <div>ICU Space: <span className="text-white block font-bold text-cyan-300">{hp.icuAvailable} beds left</span></div>
                      <div>Triage Cap: <span className="text-white block font-bold">{hp.emergencyCapacity} max</span></div>
                      <div>Overload: <span className={`block font-bold ${hp.overloadTime === 'OVERLOADED' ? 'text-red-400 font-extrabold animate-pulse' : 'text-slate-200'}`}>{hp.overloadTime}</span></div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all duration-500 ${
                          capacityPercent >= 100 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' :
                          capacityPercent > 80 ? 'bg-orange-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, capacityPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shelter Occupancy & Resource Forecast */}
          <div className="glass-panel p-4 rounded-xl flex flex-col min-h-[400px] border border-white/5">
            <div className="flex items-center space-x-1.5 text-emerald-400 border-b border-white/5 pb-2 mb-3">
              <ShelterIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-white uppercase tracking-wider font-bold">Shelter Occupancy & Stock</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {shelterForecasts.map((sp) => {
                return (
                  <div key={sp.id} className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2 relative overflow-hidden transition hover:border-emerald-500/20">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-xs block leading-tight">{sp.name}</span>
                        <span className="text-[8px] text-slate-500 block uppercase">Emergency Relief Center</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                        sp.risk === 'Critical' ? 'bg-red-950 text-red-400 border-red-500/30' :
                        sp.risk === 'High' ? 'bg-orange-950 text-orange-400 border-orange-500/30' :
                        sp.risk === 'Medium' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
                        'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {sp.risk}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] text-slate-400 pt-1 font-mono">
                      <div>Occupancy: <span className="text-white block font-bold">{sp.predictedOcc} / {sp.capacity} ({sp.occupancyPercent}%)</span></div>
                      <div>Available: <span className="text-white block font-bold text-emerald-300">{sp.remaining} spots</span></div>
                      <div>Full In: <span className={`block font-bold ${sp.timeUntilFull === 'FULL' ? 'text-red-400 animate-pulse font-extrabold' : 'text-slate-200'}`}>{sp.timeUntilFull}</span></div>
                    </div>

                    {/* Resources */}
                    <div className="space-y-1 border-t border-white/5 pt-1.5 text-[8.5px] text-slate-400 font-mono">
                      <div className="flex justify-between items-center">
                        <span>🍞 Food Supply:</span>
                        <span className={`font-bold ${sp.foodLeft < 20 ? 'text-red-400' : sp.foodLeft < 50 ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {sp.foodLeft}% ({sp.foodLeft > 70 ? 'Optimal' : sp.foodLeft > 30 ? 'Critical' : 'Depleted'})
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>💧 Water Reserve:</span>
                        <span className={`font-bold ${sp.waterLeft < 20 ? 'text-red-400' : sp.waterLeft < 50 ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {sp.waterLeft}% ({sp.waterLeft > 70 ? 'Optimal' : sp.waterLeft > 30 ? 'Critical' : 'Depleted'})
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>💊 Medical Kits:</span>
                        <span className={`font-bold ${sp.medLeft < 20 ? 'text-red-400' : sp.medLeft < 50 ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {sp.medLeft}% ({sp.medLeft > 70 ? 'Optimal' : sp.medLeft > 30 ? 'Critical' : 'Depleted'})
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, sp.occupancyPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Infrastructure Damage / Structural Failure Risks */}
          <div className="glass-panel p-4 rounded-xl flex flex-col min-h-[400px] border border-white/5">
            <div className="flex items-center space-x-1.5 text-orange-400 border-b border-white/5 pb-2 mb-3">
              <Wrench className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] text-white uppercase tracking-wider font-bold">Critical Infrastructure Risk</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {infrastructureForecasts.map((ir, idx) => {
                return (
                  <div key={idx} className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2 relative overflow-hidden transition hover:border-orange-500/20">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-xs block leading-tight">{ir.name}</span>
                        <span className="text-[8px] text-slate-500 block uppercase font-bold">{ir.type} installation</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                        ir.riskLevel === 'Critical' ? 'bg-red-950 text-red-400 border-red-500/30' :
                        ir.riskLevel === 'High' ? 'bg-orange-950 text-orange-400 border-orange-500/30 animate-pulse' :
                        ir.riskLevel === 'Medium' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
                        'bg-zinc-800 text-zinc-400 border-transparent'
                      }`}>
                        {ir.status}
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-400 pt-0.5 font-mono space-y-1">
                      <div className="flex justify-between">
                        <span>Failure Probability:</span>
                        <span className={`font-bold ${ir.probability > 70 ? 'text-red-400' : ir.probability > 40 ? 'text-orange-400' : 'text-slate-200'}`}>
                          {ir.probability}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Fail In:</span>
                        <span className="text-white font-semibold">{ir.hoursToFailure}</span>
                      </div>
                      <div className="border-t border-white/5 pt-1 mt-1 text-[8.5px] leading-relaxed text-zinc-300">
                        ⚠️ <span className="font-bold">Risk:</span> {ir.cause}
                      </div>
                      <div className="text-[8.5px] leading-relaxed text-cyan-400">
                        🛡️ <span className="font-bold text-cyan-400">Action:</span> {ir.rec}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
