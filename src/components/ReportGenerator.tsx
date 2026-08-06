'use client';

import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Incident, Vehicle, Shelter, Hospital } from '../utils/mockData';

interface ReportGeneratorProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  hospitals: Hospital[];
}

export default function ReportGenerator({
  incidents,
  vehicles,
  shelters: _shelters,
  hospitals: _hospitals,
}: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setReportReady(true);
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeCount = incidents.filter((i) => i.status !== 'Resolved').length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;
  const casualtiesCount = incidents.reduce((acc, curr) => acc + curr.casualtyEstimate, 0);

  return (
    <div className="w-full h-full flex flex-col justify-between glass-panel p-5 rounded-xl font-mono text-xs">
      <div>
        <div className="flex items-center space-x-2 text-cyan-400 border-b border-white/5 pb-2 mb-3">
          <FileText className="w-4 h-4" />
          <span className="font-bold uppercase tracking-wider">AI Tactical Report Generator</span>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
          Compile operational reports summarizing active threats, responder allocations, infrastructure health indices, and strategic action protocols. Suitable for government audits and agency updates.
        </p>

        {!reportReady ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-slate-700 mb-3" />
            {isGenerating ? (
              <div className="space-y-2">
                <span className="text-cyan-400 animate-pulse">COMPILING OPERATIONAL TELEMETRY LOGS...</span>
                <p className="text-[9px] text-slate-600">Structuring chronological crisis logs...</p>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold rounded-lg transition"
              >
                COMPILE INCIDENT LOG REPORT
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 border border-white/10 p-4 rounded-lg bg-black/40 text-[10px] leading-relaxed text-slate-300 print-section">
            <div className="text-center border-b border-white/25 pb-2 mb-3">
              <h1 className="text-sm font-extrabold text-white tracking-widest">ResQAI OPERATIONAL REPORT</h1>
              <p className="text-[8px] text-slate-500 mt-1 uppercase">GENERATED ON: {new Date().toUTCString()}</p>
            </div>

            <div className="space-y-2">
              <h2 className="font-bold text-cyan-400 border-b border-white/5 pb-0.5">1. INCIDENT CHRONOLOGY PROFILE</h2>
              <p>Current Situation status: <strong>{activeCount} active vectors</strong> under coordinate management. <strong>{resolvedCount} operations</strong> completed. <strong>{casualtiesCount} casualties</strong> forecasted.</p>
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500">
                    <th className="py-1">TYPE</th>
                    <th className="py-1">SEVERITY</th>
                    <th className="py-1">COORDINATE</th>
                    <th className="py-1">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 4).map((inc) => (
                    <tr key={inc.id} className="border-b border-white/5 text-slate-400">
                      <td className="py-1 font-semibold text-white uppercase">{inc.type}</td>
                      <td className="py-1">{inc.severity}%</td>
                      <td className="py-1">LAT {inc.location.lat.toFixed(3)}</td>
                      <td className="py-1 uppercase">{inc.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h2 className="font-bold text-cyan-400 border-b border-white/5 pb-0.5">2. RESOURCE ALLOCATION PROFILE</h2>
              <p>Fleet response coordinates active. Total deployed responder units: <strong>{vehicles.filter(v => v.status === 'Active' || v.status === 'EnRoute').length} vehicles</strong>.</p>
              <ul className="list-disc pl-3.5 space-y-0.5 text-slate-400">
                {vehicles.map((v, i) => (
                  <li key={i}>{v.name} ({v.type}) - Status: <span className="text-white font-semibold uppercase">{v.status}</span></li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="font-bold text-cyan-400 border-b border-white/5 pb-0.5">3. LESSONS LEARNED & RECOMMENDATIONS</h2>
              <ul className="list-decimal pl-3.5 space-y-1 text-slate-400">
                <li><strong>Musi River Flooding:</strong> Slum containment walls breached. Suggest building concrete embankments and flood-gate sensor telemetry.</li>
                <li><strong>Secunderabad Building Collapse:</strong> Search and rescue delayed by narrow road congestion. Recommend widening emergency transit access corridors.</li>
                <li><strong>Ananthagiri Hills Mudslide:</strong> Slope stabilization barriers failed due to heavy rainfall saturation. Advise installing steel wire rock fall mesh.</li>
              </ul>
            </div>

            <div className="text-right text-[8px] text-slate-600 border-t border-white/10 pt-2 mt-2 italic">
              Report authorized by Autonomous Coordinator ResQAI.
            </div>
          </div>
        )}
      </div>

      {reportReady && (
        <div className="flex space-x-3 mt-4 pt-4 border-t border-white/5">
          <button
            onClick={() => setReportReady(false)}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition"
          >
            COMPILE NEW
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold rounded-lg transition flex items-center justify-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT / SAVE AS PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
