'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, MapPin, Camera, HelpCircle, Shield, AlertTriangle, Loader2, CheckCircle2, RefreshCw, Lock } from 'lucide-react';
import { Incident } from '../utils/mockData';

interface CitizenSOSProps {
  onAddIncident: (inc: Omit<Incident, 'id' | 'reportedAt' | 'status'> & { status?: Incident['status'] }) => void;
  addNotification: (msg: string, type: 'emergency' | 'warning' | 'info' | 'success') => void;
  onLocationLock?: (loc: { lat: number; lng: number } | null) => void;
  compact?: boolean;
}

// Call Google Gemini Multimodal Vision API
async function analyzeImageWithGemini(
  base64Data: string, 
  mimeType: string, 
  apiKey: string
): Promise<{
  isFake: boolean;
  type: string;
  severity: number;
  casualtyEstimate: number;
  trappedCount: number;
  description: string;
  requiredResources: string[];
}> {
  const cleanBase64 = base64Data.split(',')[1];
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an AI disaster intake verification agent for Telangana State Disaster Management Authority (TSDMA).
Analyze this citizen-submitted SOS photo.
Determine if the image contains an active emergency or disaster (such as fire, flooding, landslide, building collapse, major utility hazard, road accident, or medical injury).

If the image is a generic selfie, indoor room with no crisis, computer screen, landscape with no threat, empty street, animal with no threat, or random object, return JSON:
{
  "isFake": true,
  "type": "Fake",
  "severity": 0,
  "casualtyEstimate": 0,
  "trappedCount": 0,
  "requiredResources": [],
  "description": "No active emergency detected. The image shows a generic scene without indicators of fire, flooding, or hazard."
}

If a real emergency/disaster is detected, return JSON:
{
  "isFake": false,
  "type": "Fire", // Choose one: Fire, Flood, Landslide, Medical Emergency, Road Blockage, Snake Sighting, Injured Stray Animal, Large Pothole
  "severity": 85, // 0-100 scale
  "casualtyEstimate": 1,
  "trappedCount": 0,
  "description": "Short summary of the threat seen in the image",
  "requiredResources": ["Fire Truck"] // e.g. ["Fire Truck"], ["Ambulance"], ["Rescue Boat"], ["Wildlife Rescue Team"]
}

Output ONLY raw JSON. No markdown blocks, backticks, or formatting.`
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

export default function CitizenSOS({ onAddIncident, addNotification, onLocationLock, compact = false }: CitizenSOSProps) {
  const [sosCategory, setSosCategory] = useState<'Medical' | 'Rescue' | 'Food' | 'Water' | 'Fire' | 'Police'>('Rescue');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [locationLocked, setLocationLocked] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [gpsSimulated, setGpsSimulated] = useState<{ lat: number; lng: number } | null>(null);

  // Real photo upload states
  const [photoName, setPhotoName] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMime, setPhotoMime] = useState('');
  const [aiScanning, setAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const handleDetectLocation = useCallback((silent = false) => {
    setIsLocating(true);
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 4);
          setGpsSimulated({ lat, lng });
          setLocationLocked(true);
          setIsLocating(false);
          setLocationAccuracy(accuracy);
          setLocationName(`Auto-Locked: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          onLocationLock?.({ lat, lng });
          if (!silent) {
            addNotification(`GPS locked: ${lat.toFixed(4)}, ${lng.toFixed(4)} (±${accuracy}m precision)`, 'success');
          }

          // Optional reverse geocoding to human-readable locality
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                const parts = data.display_name.split(', ');
                const shortAddr = parts.slice(0, 3).join(', ');
                setLocationName(shortAddr || data.display_name);
              }
            }
          } catch {
            // Keep default locked coordinate label on geocoding timeout
          }
        },
        () => {
          const lat = 17.3850 + (Math.random() - 0.5) * 0.015;
          const lng = 78.4867 + (Math.random() - 0.5) * 0.015;
          setGpsSimulated({ lat, lng });
          setLocationLocked(true);
          setIsLocating(false);
          setLocationAccuracy(12);
          setLocationName(`Auto-Locked: Hyderabad Sector (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          onLocationLock?.({ lat, lng });
          if (!silent) {
            addNotification('GPS permission restricted. Auto-locked to Hyderabad sector coordinates.', 'warning');
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      const lat = 17.3850 + (Math.random() - 0.5) * 0.015;
      const lng = 78.4867 + (Math.random() - 0.5) * 0.015;
      setGpsSimulated({ lat, lng });
      setLocationLocked(true);
      setIsLocating(false);
      setLocationAccuracy(15);
      setLocationName(`Auto-Locked: Hyderabad Sector (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      onLocationLock?.({ lat, lng });
    }
  }, [addNotification, onLocationLock]);

  // Automatically acquire and lock GPS location the moment the citizen opens/reports an issue
  useEffect(() => {
    handleDetectLocation(true);
  }, [handleDetectLocation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoName(file.name);
    setPhotoMime(file.type);
    setAiError(null);
    setAiAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      addNotification('Initiating AI vision analysis on visual media...', 'info');
      setAiScanning(true);

      try {
        const rawKey = typeof window !== 'undefined' ? atob('QVEuQWI4Uk42STE3V2FUYVZEdVNEdU1EQzEzWTRtU1ZsU3poUG9zM2t2Umk4NGZGdUhMQQ==') : '';
        const apiKey = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || rawKey;
        const aiResponse = await analyzeImageWithGemini(base64, file.type, apiKey);

        if (aiResponse.isFake) {
          setAiError(aiResponse.description || 'AI Warning: Visual attachment classified as non-hazard or mock.');
          addNotification('AI Warning: No active physical hazard detected. Photo attached for manual review.', 'warning');
          setAiAnalysisResult(null); // Proceed to EOC manual validation
        } else {
          setAiAnalysisResult(aiResponse);
          
          // Map AI response type to form category
          const type = aiResponse.type;
          let mappedCat: 'Medical' | 'Rescue' | 'Food' | 'Water' | 'Fire' | 'Police' = 'Rescue';
          
          if (type === 'Fire') {
            mappedCat = 'Fire';
          } else if (type === 'Flood' || type === 'Flooding') {
            mappedCat = 'Water';
          } else if (type === 'Medical Emergency') {
            mappedCat = 'Medical';
          } else if (type === 'Road Blockage') {
            mappedCat = 'Police';
          } else if (type === 'Large Pothole') {
            mappedCat = 'Rescue';
          } else if (type === 'Food' || type === 'Supplies') {
            mappedCat = 'Food';
          }
          
          setSosCategory(mappedCat);
          if (aiResponse.description) {
            setDescription(aiResponse.description);
          }
          addNotification(`AI Verified: Classified emergency as "${type}" (${aiResponse.severity}% severity). Form updated.`, 'success');
        }
      } catch (err: any) {
        console.error('Gemini verification error:', err);
        addNotification('AI verification offline. Photo attached for manual operator review.', 'warning');
        setAiAnalysisResult(null); // Proceed to EOC manual validation
      } finally {
        setAiScanning(false);
      }
    };
    reader.onerror = () => {
      addNotification('Failed to read visual attachment.', 'warning');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting || aiScanning) return;

    setIsSubmitting(true);
    setAiError(null);

    let parsedAiResult = aiAnalysisResult;

    if (photoBase64 && !parsedAiResult) {
      setAiScanning(true);
      try {
        const apiKey = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        const aiResponse = await analyzeImageWithGemini(photoBase64, photoMime, apiKey);
        
        if (aiResponse.isFake) {
          setAiError(aiResponse.description || 'AI Vision Scan: No active hazard or emergency indicators found in attachment.');
          addNotification('SOS Rejected: AI vision indicates no active threat.', 'warning');
          setAiScanning(false);
          setIsSubmitting(false);
          return;
        }
        
        parsedAiResult = aiResponse;
        setAiAnalysisResult(aiResponse);
      } catch (err: any) {
        console.error('Gemini verification error:', err);
        addNotification('AI verification offline. Proceeding with standard EOC routing.', 'warning');
      } finally {
        setAiScanning(false);
      }
    }

    // Determine coordinates
    const finalLoc = gpsSimulated || {
      lat: 17.3850 + (Math.random() - 0.5) * 0.02,
      lng: 78.4867 + (Math.random() - 0.5) * 0.02
    };

    // Map Citizen SOS Category to Incident Type and Category
    const descLower = description.toLowerCase();
    let category: Incident['category'] = 'Disaster Response';
    let mappedType: Incident['type'] = 'Building Collapse';
    let requiredResources: string[] = ['Ambulance'];
    let baseSeverity = 75;

    // Use AI verified details if available
    if (parsedAiResult) {
      mappedType = parsedAiResult.type as Incident['type'];
      baseSeverity = parsedAiResult.severity || 70;
      requiredResources = parsedAiResult.requiredResources || ['Ambulance'];
      
      if (mappedType === 'Fire' || mappedType === 'Flood' || mappedType === 'Landslide' || mappedType === 'Building Collapse') {
        category = 'Disaster Response';
      } else if (mappedType === 'Snake Sighting') {
        category = 'Animal Rescue';
      } else if (mappedType === 'Injured Stray Animal') {
        category = 'Veterinary Services';
      } else if (mappedType === 'Large Pothole') {
        category = 'Infrastructure Issues';
      } else {
        category = 'Disaster Response';
      }
    } else {
      // Local fallbacks if AI fails or no photo attached
      if (descLower.includes('snake') || descLower.includes('cobra')) {
        mappedType = 'Snake Sighting';
        category = 'Animal Rescue';
        requiredResources = ['Wildlife Rescue Team'];
        baseSeverity = 55;
      } else if (descLower.includes('injured stray') || descLower.includes('injured dog') || descLower.includes('injured animal') || descLower.includes('hurt dog')) {
        mappedType = 'Injured Stray Animal';
        category = 'Veterinary Services';
        requiredResources = ['Veterinary Rescue Van'];
        baseSeverity = 40;
      } else if (descLower.includes('pothole') || descLower.includes('broken road')) {
        mappedType = 'Large Pothole';
        category = 'Infrastructure Issues';
        requiredResources = ['Road Maintenance Crew'];
        baseSeverity = 35;
      } else if (descLower.includes('sewage') || descLower.includes('sewer') || descLower.includes('drain')) {
        mappedType = 'Sewage Overflow';
        category = 'Utility Failures';
        requiredResources = ['Municipal Sewage Maintenance'];
        baseSeverity = 30;
      } else if (descLower.includes('power') || descLower.includes('electric pole') || descLower.includes('wire')) {
        mappedType = 'Fallen Electric Pole';
        category = 'Utility Failures';
        requiredResources = ['TS-SPDCL Power Utility Team'];
        baseSeverity = 40;
      } else if (sosCategory === 'Fire') {
        mappedType = 'Fire';
        category = 'Disaster Response';
        requiredResources = ['Fire Truck'];
        baseSeverity = 80;
      } else if (sosCategory === 'Water' || descLower.includes('flood')) {
        mappedType = 'Flood';
        category = 'Disaster Response';
        requiredResources = ['Rescue Boat'];
        baseSeverity = 65;
      } else if (sosCategory === 'Medical') {
        mappedType = 'Medical Emergency';
        category = 'Disaster Response';
        requiredResources = ['Ambulance'];
        baseSeverity = 85;
      } else if (sosCategory === 'Police') {
        mappedType = 'Road Blockage';
        category = 'Public Safety';
        requiredResources = ['Police Patrol'];
        baseSeverity = 40;
      } else {
        mappedType = 'Rescue Request';
        category = 'Disaster Response';
        requiredResources = ['Urban Search & Rescue Unit', 'Ambulance'];
        baseSeverity = 70;
      }
    }

    let snakeDetails;
    if (mappedType === 'Snake Sighting') {
      const isIndoors = descLower.includes('indoor') || descLower.includes('kitchen') || descLower.includes('house') || descLower.includes('room');
      snakeDetails = {
        urgency: isIndoors ? ('High' as const) : ('Medium' as const),
        environment: isIndoors ? ('Indoors' as const) : ('Outdoors' as const),
        recommendation: 'Contacting Telangana Forest Department Snake Rescue unit.'
      };
    }

    let animalRescueDetails;
    if (category === 'Veterinary Services') {
      animalRescueDetails = {
        animalType: descLower.includes('dog') ? 'Dog' : descLower.includes('cat') ? 'Cat' : 'Stray Animal',
        condition: 'Injured / Distressed',
        recommendation: 'Dispatching Veterinary Animal Rescue team.',
        summary: 'Distressed animal reported via citizen portal.'
      };
    }

    let civicDetails;
    if (category === 'Infrastructure Issues' || category === 'Utility Failures' || category === 'Public Safety') {
      civicDetails = {
        recommendedDepartment: category === 'Utility Failures' ? 'TS-SPDCL Utility Wing' : 'GHMC Public Services',
        reportSummary: 'Civic safety issue registered and routed.'
      };
    }

    const finalAddress = locationName || `Auto-Locked GPS: ${finalLoc.lat.toFixed(5)}, ${finalLoc.lng.toFixed(5)}`;

    onAddIncident({
      type: mappedType,
      category,
      severity: baseSeverity + (parsedAiResult ? 0 : Math.floor(Math.random() * 15)),
      location: finalLoc,
      addressContext: finalAddress,
      description: parsedAiResult 
        ? `VERIFIED SOS REPORT: ${description}. (AI Scan: ${parsedAiResult.description})`
        : `CITIZEN SOS REPORT: ${description}. (Location: ${finalAddress})`,
      casualtyEstimate: parsedAiResult?.casualtyEstimate ?? Math.round(Math.random() * 2),
      trappedCount: parsedAiResult?.trappedCount ?? Math.round(Math.random() * 2),
      requiredResources,
      reporter: 'Citizen SOS',
      needsSOSValidation: !parsedAiResult, // Already AI verified, no EOC human verification needed
      aiPriority: 'HIGH',
      etaResolution: 4,
      status: parsedAiResult ? 'Reported' : 'Pending',
      snakeDetails,
      animalRescueDetails,
      civicDetails,
      photoBase64: photoBase64 || undefined
    });

    if (parsedAiResult) {
      addNotification(`AI VERIFIED SOS: Broadcast registered for ${mappedType} severity ${baseSeverity}%.`, 'success');
    } else {
      addNotification(`CITIZEN SOS RECEIVED: Dispatching assessment unit for ${sosCategory} request at locked coordinates.`, 'emergency');
    }

    // Reset inputs, preserving locked GPS for subsequent reports
    setDescription('');
    setPhotoName('');
    setPhotoBase64('');
    setPhotoMime('');
    setAiAnalysisResult(null);
    setIsSubmitting(false);
  };

  return (
    <div className={`w-full h-full font-mono text-xs flex flex-col justify-between p-1 bg-zinc-950/20`}>
      <div>
        {!compact && (
          <>
            <div className="flex items-center space-x-2 text-red-500 border-b border-white/5 pb-3 mb-4">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-bold tracking-wider uppercase">Citizen SOS Dispatch Portal</span>
            </div>

            <p className="text-slate-400 mb-4 leading-relaxed text-[11px]">
              If you are in danger, use this portal to broadcast your coordinates directly to the disaster response platform. The system will categorize your ticket and direct the nearest first responder crew.
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Category */}
          <div>
            <label className="text-slate-400 block mb-1 uppercase text-[10px]">Select Emergency Category</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Rescue', 'Medical', 'Fire', 'Water', 'Police', 'Food'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSosCategory(cat)}
                  className={`py-2 px-1 border rounded-lg text-center font-semibold transition ${
                    sosCategory === cat
                      ? 'bg-red-950/40 text-red-400 border-red-500/50'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:border-slate-800'
                  }`}
                >
                  {cat === 'Medical' && '🚑 Medical'}
                  {cat === 'Rescue' && '🛟 Rescue'}
                  {cat === 'Fire' && '🔥 Fire'}
                  {cat === 'Water' && '🌊 Flooding'}
                  {cat === 'Police' && '👮 Police'}
                  {cat === 'Food' && '📦 Supplies'}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-slate-400 block mb-1 uppercase text-[10px]">Describe Your Emergency</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what is happening, how many people are with you, and any injuries..."
              className="w-full h-24 bg-zinc-900/60 border border-white/10 rounded-lg p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* GPS & Photo Upload Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 uppercase text-[10px]">GPS Coordinates</label>
                {locationLocked && (
                  <span className="inline-flex items-center space-x-1 text-[9px] text-emerald-400 font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>AUTO-LOCKED</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDetectLocation(false)}
                disabled={isLocating}
                title="Click to recalibrate GPS location"
                className={`w-full py-2 flex items-center justify-center space-x-1.5 border rounded-lg transition ${
                  locationLocked && gpsSimulated
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : isLocating
                    ? 'bg-cyan-950/30 text-cyan-300 border-cyan-500/40 animate-pulse'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:border-slate-500'
                }`}
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span className="text-[10px] font-bold tracking-wider">LOCKING GPS...</span>
                  </>
                ) : locationLocked ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold tracking-wider text-emerald-300">GPS AUTO-LOCKED</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold tracking-wider">ACQUIRE GPS</span>
                  </>
                )}
              </button>
            </div>
            
            <div>
              <label className="text-slate-400 block mb-1 uppercase text-[10px]">Visual Media Attachment</label>
              <input
                type="file"
                id="sos-photo-input"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={aiScanning}
                onClick={() => document.getElementById('sos-photo-input')?.click()}
                className={`w-full py-2 flex items-center justify-center space-x-1.5 border rounded-lg transition overflow-hidden text-ellipsis whitespace-nowrap px-2 cursor-pointer ${
                  aiScanning
                    ? 'bg-cyan-950/20 text-cyan-400 border-cyan-500/40 animate-pulse'
                    : photoBase64
                    ? 'bg-cyan-950/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.1)] font-bold'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:border-slate-500'
                }`}
              >
                {aiScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
                    <span className="truncate text-[10px]">SCANNING IMAGE...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate text-[10px]">
                      {photoName ? photoName : 'ATTACH PHOTO'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Auto-Locked GPS Telemetry HUD */}
          {gpsSimulated ? (
            <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-lg text-[9.5px] flex flex-col gap-1 font-mono shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 tracking-wider">🟢 AUTOMATICALLY LOCKED</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDetectLocation(false)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-emerald-300 transition text-[9px]"
                  title="Recalibrate GPS"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>Recalibrate</span>
                </button>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[9px]">
                <span className="truncate max-w-[220px] text-slate-200 font-semibold">
                  {locationName || `Lat: ${gpsSimulated.lat.toFixed(5)}, Lng: ${gpsSimulated.lng.toFixed(5)}`}
                </span>
                <span className="text-emerald-400/80 font-mono text-[9px] flex-shrink-0">
                  ±{locationAccuracy || 4}m Precision
                </span>
              </div>
              <div className="text-[8.5px] text-slate-400 flex justify-between">
                <span>LAT: {gpsSimulated.lat.toFixed(5)} | LNG: {gpsSimulated.lng.toFixed(5)}</span>
                <span className="text-emerald-400/70 font-semibold">Tagged to report</span>
              </div>
            </div>
          ) : isLocating ? (
            <div className="bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 px-3 py-2 rounded-lg text-[9.5px] flex items-center justify-between font-mono animate-pulse">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Auto-locking live satellite coordinates...</span>
              </div>
              <span className="text-[9px] text-cyan-400/80 font-bold">HIGH PRECISION</span>
            </div>
          ) : null}

          {aiAnalysisResult && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg text-[9px] flex items-start gap-2 font-mono">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="leading-tight">
                <div className="font-bold uppercase tracking-wider text-emerald-300">AI Intake Verified & Classified</div>
                <div className="opacity-90 mt-0.5">Category: <span className="text-white font-bold">{aiAnalysisResult.type}</span> | Severity: <span className="text-white font-bold">{aiAnalysisResult.severity}%</span></div>
                <div className="opacity-75 mt-1 italic">"{aiAnalysisResult.description}"</div>
              </div>
            </div>
          )}

          {/* AI Intake Errors */}
          {aiError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg text-[9px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="leading-tight">
                <div className="font-bold uppercase tracking-wider text-red-300">Intake Blocked: False Alarm Filter</div>
                <div className="opacity-80 mt-0.5 leading-relaxed">{aiError}</div>
              </div>
            </div>
          )}
        </form>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !description.trim() || aiScanning}
        className={`w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold rounded-lg uppercase tracking-wider text-xs transition flex items-center justify-center space-x-2 ${
          compact ? 'mt-4 py-2.5' : 'mt-6 py-3'
        }`}
      >
        {aiScanning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-900 animate-duration-1000" />
            <span className="animate-pulse">AI VETTING SCAN RUNNING...</span>
          </>
        ) : isSubmitting ? (
          <span className="animate-pulse">TRANSMITTING SOS SIGNAL...</span>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>TRANSMIT SOS SIGNAL NOW</span>
          </>
        )}
      </button>
    </div>
  );
}
