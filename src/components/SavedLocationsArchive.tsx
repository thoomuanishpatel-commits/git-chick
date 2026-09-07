'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, MapPin, Search, CheckCircle2, 
  AlertTriangle, Navigation, Copy, Check, Filter, 
  Calendar, Shield, ExternalLink, Printer, Database, Clock
} from 'lucide-react';
import { Incident } from '../utils/mockData';

interface SavedLocationsArchiveProps {
  incidents: Incident[];
  onSelectIncident: (inc: Incident | null) => void;
  selectedIncident: Incident | null;
  addNotification: (msg: string, type: 'emergency' | 'warning' | 'info' | 'success') => void;
}

export default function SavedLocationsArchive({
  incidents,
  onSelectIncident,
  selectedIncident,
  addNotification,
}: SavedLocationsArchiveProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
    const active = total - resolved;
    const totalCasualtiesHandled = incidents.reduce((sum, i) => sum + (i.casualtyEstimate || 0), 0);
    return { total, active, resolved, totalCasualtiesHandled };
  }, [incidents]);

  // Filtered incidents list
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Status filter
      const isResolved = inc.status === 'Resolved' || inc.status === 'Closed';
      if (statusFilter === 'active' && isResolved) return false;
      if (statusFilter === 'resolved' && !isResolved) return false;

      // Category filter
      if (categoryFilter !== 'all' && inc.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const coordString = `${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)}`;
        return (
          inc.id.toLowerCase().includes(q) ||
          inc.type.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q) ||
          inc.reporter.toLowerCase().includes(q) ||
          coordString.includes(q) ||
          (inc.addressContext && inc.addressContext.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [incidents, statusFilter, categoryFilter, searchQuery]);

  // Copy shareable link to clipboard
  const handleCopyLink = (inc: Incident) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?incident=${inc.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(inc.id);
      setTimeout(() => setCopiedId(null), 2000);
      addNotification(`COPIED: Disaster location link copied for ${inc.type} (${inc.id}).`, 'success');
    }).catch(() => {
      addNotification('Failed to copy disaster link to clipboard.', 'warning');
    });
  };

  // Copy raw GPS coordinates
  const handleCopyCoords = (lat: number, lng: number) => {
    const coordText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    navigator.clipboard.writeText(coordText).then(() => {
      addNotification(`GPS LOCKED: Coordinates [${coordText}] copied to clipboard.`, 'info');
    });
  };

  // Export as structured JSON File
  const handleExportJSON = () => {
    const exportData = {
      agency: "Telangana State Disaster Management Authority (TSDMA)",
      system: "ResQAI Emergency Command Registry",
      exportTimestamp: new Date().toISOString(),
      recordCount: incidents.length,
      locations: incidents.map((inc) => ({
        id: inc.id,
        type: inc.type,
        category: inc.category,
        severity: inc.severity,
        status: inc.status,
        coordinates: {
          latitude: inc.location.lat,
          longitude: inc.location.lng,
          formatted: `${inc.location.lat.toFixed(5)}°N, ${inc.location.lng.toFixed(5)}°E`
        },
        addressContext: inc.addressContext || "Telangana EOC Coordinate Grid",
        reportedAt: inc.reportedAt,
        resolvedAt: inc.resolvedAt || (inc.status === 'Resolved' ? 'Recorded as resolved' : null),
        resolutionSummary: inc.resolutionSummary || null,
        trappedCount: inc.trappedCount,
        casualtyEstimate: inc.casualtyEstimate,
        reporter: inc.reporter,
        aiPriority: inc.aiPriority,
        assignedVehicleId: inc.assignedVehicleId || null,
        requiredResources: inc.requiredResources
      }))
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `resqai_disaster_locations_archive_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addNotification('FILE EXPORT: Disaster location archive JSON downloaded successfully.', 'success');
  };

  // Export as CSV Spreadsheet File
  const handleExportCSV = () => {
    const headers = [
      'Incident ID',
      'Type',
      'Category',
      'Status',
      'Latitude',
      'Longitude',
      'Severity',
      'Trapped',
      'Casualties',
      'Reported At',
      'Resolved At',
      'Reporter',
      'Assigned Responder',
      'Resolution Summary',
      'Description'
    ];

    const rows = incidents.map((inc) => [
      `"${inc.id}"`,
      `"${inc.type}"`,
      `"${inc.category}"`,
      `"${inc.status}"`,
      inc.location.lat.toFixed(5),
      inc.location.lng.toFixed(5),
      inc.severity,
      inc.trappedCount,
      inc.casualtyEstimate,
      `"${inc.reportedAt}"`,
      `"${inc.resolvedAt || (inc.status === 'Resolved' ? 'Resolved' : 'In Progress')}"`,
      `"${inc.reporter}"`,
      `"${inc.assignedVehicleId || 'None'}"`,
      `"${(inc.resolutionSummary || '').replace(/"/g, '""')}"`,
      `"${(inc.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resqai_disaster_coordinates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    addNotification('FILE EXPORT: Disaster coordinates CSV sheet downloaded successfully.', 'success');
  };

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs text-white space-y-4">
      {/* Top Header & Key Metrics */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                <span>Disaster Location Registry & Archive</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-[8px]">
                  AUDIT LOG
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">
                Permanent spatial log of all disaster coordinates, past rescue milestones, and resolved incidents.
              </p>
            </div>
          </div>

          {/* Export File Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-cyan-500/50 text-cyan-400 hover:text-white transition flex items-center space-x-1.5 text-[10px] font-bold cursor-pointer"
              title="Download structured JSON file containing all saved coordinates and logs"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT JSON</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/30 hover:bg-emerald-900 text-emerald-400 font-bold transition flex items-center space-x-1.5 text-[10px] cursor-pointer"
              title="Download CSV spreadsheet compatible with Excel and GIS software"
            >
              <FileText className="w-3 h-3" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Print official incident dossier"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Total Locations Saved</span>
            <span className="text-base font-extrabold text-white font-mono">{stats.total}</span>
            <span className="text-[8px] text-cyan-400 block mt-0.5">Permanent spatial cache</span>
          </div>

          <div className="p-2.5 bg-black/40 border border-red-500/20 rounded-lg">
            <span className="text-[9px] uppercase tracking-wider text-red-400 block">Active Crisis Sites</span>
            <span className="text-base font-extrabold text-red-500 font-mono">{stats.active}</span>
            <span className="text-[8px] text-zinc-400 block mt-0.5">Deployment underway</span>
          </div>

          <div className="p-2.5 bg-black/40 border border-emerald-500/20 rounded-lg">
            <span className="text-[9px] uppercase tracking-wider text-emerald-400 block">Resolved & Archived</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">{stats.resolved}</span>
            <span className="text-[8px] text-zinc-400 block mt-0.5">Saved post-rescue</span>
          </div>

          <div className="p-2.5 bg-black/40 border border-amber-500/20 rounded-lg">
            <span className="text-[9px] uppercase tracking-wider text-amber-400 block">Casualties Mitigated</span>
            <span className="text-base font-extrabold text-amber-400 font-mono">{stats.totalCasualtiesHandled}</span>
            <span className="text-[8px] text-zinc-400 block mt-0.5">Lives protected</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search saved locations by ID, coordinates, disaster type, landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-[10px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1 bg-zinc-900/60 border border-white/10 p-1 rounded-lg">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition ${
              statusFilter === 'all'
                ? 'bg-cyan-500 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition ${
              statusFilter === 'active'
                ? 'bg-red-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-black font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Resolved ({stats.resolved})
          </button>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-900/60 border border-white/10 rounded-lg px-2.5 py-2 text-[10px] text-zinc-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Categories</option>
          <option value="Disaster Response">Disaster Response</option>
          <option value="Public Safety">Public Safety</option>
          <option value="Animal Rescue">Animal Rescue</option>
          <option value="Veterinary Services">Veterinary Services</option>
          <option value="Infrastructure Issues">Infrastructure Issues</option>
          <option value="Utility Failures">Utility Failures</option>
          <option value="Environmental Hazards">Environmental Hazards</option>
        </select>
      </div>

      {/* Incident Records Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[350px]">
        {filteredIncidents.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl text-center p-6 space-y-2">
            <AlertTriangle className="w-8 h-8 text-zinc-600" />
            <p className="text-zinc-400 font-bold uppercase text-[11px]">No Saved Disaster Locations Match</p>
            <p className="text-zinc-600 text-[10px] max-w-sm">
              Try adjusting your search criteria or filter to see active or resolved disaster coordinate records.
            </p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            const isResolved = inc.status === 'Resolved' || inc.status === 'Closed';
            const isCopied = copiedId === inc.id;

            return (
              <div
                key={inc.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col space-y-2.5 ${
                  isSelected
                    ? 'bg-zinc-900 border-cyan-500 ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : isResolved
                    ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/40'
                    : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Top Row: Type, Status Badge, Priority */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">
                      {inc.type === 'Flood' ? '🌊' :
                       inc.type === 'Fire' ? '🔥' :
                       inc.type === 'Chemical Leak' ? '☢️' :
                       inc.type === 'Building Collapse' ? '🏢' :
                       inc.type === 'Landslide' ? '⛰️' :
                       inc.type === 'Snake Sighting' ? '🐍' :
                       inc.type === 'Medical Emergency' ? '🚑' :
                       inc.type === 'POLICE_SOS' ? '🚨' : '⚠️'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-xs tracking-wide">
                          {inc.type}
                        </span>
                        <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                          {inc.id}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-500 block">
                        Category: {inc.category} • Reported: {inc.reportedAt} via {inc.reporter}
                      </span>
                    </div>
                  </div>

                  {/* Status & Resolution Badge */}
                  <div className="flex items-center space-x-2">
                    {isResolved ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>RESOLVED & ARCHIVED</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[8px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span>{inc.status} ({inc.severity}% SEV)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Description & Resolution Summary */}
                <div className="space-y-1 text-[10px] leading-relaxed">
                  <p className="text-zinc-300">{inc.description}</p>
                  
                  {/* Resolution Dossier if resolved */}
                  {isResolved && (
                    <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[9px] space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-400 uppercase text-[8px] tracking-wider">
                        <Check className="w-3 h-3" />
                        <span>Historical Resolution Record</span>
                        {inc.resolvedAt && <span>• Cleared at {inc.resolvedAt}</span>}
                      </div>
                      <p className="text-zinc-400 leading-normal">
                        {inc.resolutionSummary || 'Successfully neutralized by deployed responders. All victims evacuated and site declared safe.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Exact Coordinates & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[9px]">
                  {/* Coordinates pill */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleCopyCoords(inc.location.lat, inc.location.lng)}
                      className="px-2 py-1 rounded bg-black/50 border border-white/10 hover:border-cyan-500/40 text-cyan-400 font-mono flex items-center gap-1 transition cursor-pointer"
                      title="Click to copy exact GPS coordinates"
                    >
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{inc.location.lat.toFixed(4)}°N, {inc.location.lng.toFixed(4)}°E</span>
                    </button>
                    {inc.addressContext && (
                      <span className="text-zinc-500 text-[8px] hidden md:inline truncate max-w-xs">
                        {inc.addressContext}
                      </span>
                    )}
                  </div>

                  {/* Actions: Focus on Map, Copy Link, Navigate */}
                  <div className="flex items-center space-x-1.5">
                    {/* Focus on Map */}
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Center and highlight this location on the tactical map"
                    >
                      <Navigation className="w-3 h-3 text-cyan-400" />
                      <span>FOCUS MAP</span>
                    </button>

                    {/* Copy Shareable Link */}
                    <button
                      onClick={() => handleCopyLink(inc)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Copy direct shareable URL link for this disaster"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'LINK COPIED' : 'SHARE LINK'}</span>
                    </button>

                    {/* Google Maps Directions */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${inc.location.lat},${inc.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Open Google Maps directions to this exact coordinate"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>NAVIGATE</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
