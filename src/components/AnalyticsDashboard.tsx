'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Activity, ShieldAlert, Award, Heart, CheckCircle2 } from 'lucide-react';
import { Incident, Vehicle } from '../utils/mockData';

interface AnalyticsDashboardProps {
  incidents: Incident[];
  vehicles: Vehicle[];
}

export default function AnalyticsDashboard({ incidents, vehicles }: AnalyticsDashboardProps) {

  // Calculate incident categories
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;
  const activeCount = incidents.filter((i) => i.status !== 'Resolved').length;
  const livesSaved = resolvedCount * 10 + incidents.filter(i => i.status === 'Active').reduce((acc, i) => acc + (i.casualtyEstimate > 0 ? 2 : 0), 0);

  // Group incidents by type for BarChart
  const types = ['Fire', 'Flood', 'Building Collapse', 'Landslide', 'Road Blockage'];
  const incidentData = types.map((t) => ({
    name: t,
    count: incidents.filter((i) => i.type === t && i.status !== 'Resolved').length,
  }));

  // Resource deployment statistics for PieChart
  const activeVehicles = vehicles.filter((v) => v.status === 'Active' || v.status === 'EnRoute').length;
  const idleVehicles = vehicles.filter((v) => v.status === 'Idle').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'Maintenance').length;

  const fleetUtilizationData = [
    { name: 'Deployed', value: activeVehicles, color: '#ff7700' },
    { name: 'Idle Standby', value: idleVehicles, color: '#00d2ff' },
    { name: 'Maintenance', value: maintenanceVehicles, color: '#64748b' },
  ];

  // Historical response time trend (simulated 12 hours)
  const historicalResponseTimes = [
    { hour: '00:00', duration: 18 },
    { hour: '02:00', duration: 15 },
    { hour: '04:00', duration: 22 },
    { hour: '06:00', duration: 14 },
    { hour: '08:00', duration: 12 },
    { hour: '10:00', duration: 9 }, // showing improving response times!
  ];

  return (
    <div className="resizable-container-root flex flex-col space-y-4 font-mono text-xs">
      {/* Top statistics overview cards */}
      <div className="grid responsive-kpi-grid gap-4">
        {/* KPI 1 */}
        <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-red-950/40 rounded-lg text-red-500">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">ACTIVE CASES</div>
            <div className="text-xl font-bold text-white">{activeCount}</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-emerald-950/40 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">RESOLVED DEVIATIONS</div>
            <div className="text-xl font-bold text-white">{resolvedCount}</div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-pink-950/40 rounded-lg text-pink-500">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">LIVES SECURED</div>
            <div className="text-xl font-bold text-pink-400">{livesSaved}</div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/40 rounded-lg text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">FLEET RESPONSE RATE</div>
            <div className="text-xl font-bold text-cyan-400">
              {vehicles.length > 0 ? Math.round((activeVehicles / vehicles.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid responsive-chart-grid gap-4 flex-1 min-h-[220px]">
        {/* BarChart: Active Incidents by Category */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Active Incidents by Category</span>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080e1c', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 10 }}
                />
                <Bar dataKey="count" fill="#ff7700" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AreaChart: Response Time Trend */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Fleet Response Time Trend (mins)</span>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalResponseTimes} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080e1c', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 10 }}
                />
                <Area type="monotone" dataKey="duration" stroke="#00d2ff" fill="rgba(0,210,255,0.1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PieChart: Fleet Utilization */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Fleet Resource Allocation</span>
          <div className="flex-1 min-h-[160px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetUtilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {fleetUtilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#080e1c', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <div className="absolute right-2 top-10 space-y-1.5 text-[9px] text-slate-400">
              {fleetUtilizationData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
