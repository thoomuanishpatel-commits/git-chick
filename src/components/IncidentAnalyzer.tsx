'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Upload, Mic, ShieldAlert, Loader2, Sparkles, Send, Square, 
  Pause, RotateCcw, CheckCircle, FileText, X, Volume2, Plus, 
  RefreshCw, MapPin, Search, Compass, AlertTriangle, Info, Key
} from 'lucide-react';
import { 
  Incident, 
  defaultHospitals, 
  defaultShelters, 
  defaultPoliceStations, 
  defaultFireStations 
} from '../utils/mockData';
import { getDistance } from '../utils/routing';

const PRESET_DISASTERS = [
  {
    type: "Chemical Leak" as const,
    severity: 85,
    locationName: "Jeedimetla Industrial Area, Hyderabad",
    lat: 17.5186,
    lng: 78.4554,
    description: "Thermal fire and chemical spill detected at industrial chemical plant in Jeedimetla, Hyderabad."
  },
  {
    type: "Flood" as const,
    severity: 92,
    locationName: "Chaderghat Bridge, Musi River, Hyderabad",
    lat: 17.3685,
    lng: 78.4967,
    description: "Water levels rising above threat mark on Musi River basin near Chaderghat, causing urban flooding."
  },
  {
    type: "Landslide" as const,
    severity: 65,
    locationName: "Ananthagiri Hills Road, Vikarabad",
    lat: 17.3300,
    lng: 77.9000,
    description: "Debris flow and heavy soil displacement blocking rural road access routes in Vikarabad hill valley."
  }
];

interface IncidentAnalyzerProps {
  onAddIncident: (inc: Omit<Incident, 'id' | 'reportedAt' | 'status'> & { status?: Incident['status'] }) => void;
  addNotification?: (msg: string, type: 'emergency' | 'warning' | 'info' | 'success') => void;
}

interface AnalysisResult {
  type: Incident['type'];
  category: Incident['category'];
  description: string;
  severity: number;
  casualtyEstimate: number;
  trappedCount: number;
  requiredResources: string[];
  priority: string;
  actions: string[];
  confidence: number;
  locationName: string;
  lat: number;
  lng: number;
  nearbyHospitals: string[];
  nearbyPoliceStations: string[];
  nearbyFireStations: string[];
  nearbyShelters: string[];
  weather: string;
  populationDensity: string;
  
  // Custom details:
  snakeDetails?: Incident['snakeDetails'];
  animalRescueDetails?: Incident['animalRescueDetails'];
  civicDetails?: Incident['civicDetails'];
}

// Helper to resolve nearest facilities dynamically
function getNearbyResources(lat: number, lng: number, type: Incident['type']) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortNearest = (list: any[]) => {
    return list
      .map(item => ({
        name: item.name,
        dist: getDistance({ lat, lng }, item.location)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2)
      .map(item => `${item.name} (${item.dist.toFixed(1)}km)`);
  };

  const hospitals = sortNearest(defaultHospitals);
  const police = sortNearest(defaultPoliceStations);
  const fire = sortNearest(defaultFireStations);
  const shelters = sortNearest(defaultShelters);

  let weather = 'Rainy, 24°C, Humidity 85%, Wind 18km/h SE';
  if (type === 'Fire' || type === 'Chemical Leak') {
    weather = 'Hot & Dry, 38°C, Wind 14km/h';
  } else if (type === 'Medical Emergency' || type === 'Building Collapse') {
    weather = 'Clear, 28°C, Wind 6km/h';
  }

  const population = `${Math.floor(12000 + Math.random() * 15000).toLocaleString()} citizens / sq km`;

  return {
    hospitals,
    police,
    fire,
    shelters,
    weather,
    population
  };
}

function getIncidentCategory(type: Incident['type']): Incident['category'] {
  const animalRescueTypes: Incident['type'][] = ['Snake Sighting', 'Wild Animal Rescue', 'Bee/Wasp Swarm', 'Monkey Nuisance', 'Illegal Wildlife Sighting'];
  const vetServicesTypes: Incident['type'][] = ['Injured Stray Animal', 'Veterinary Emergency', 'Animal Disease Outbreak'];
  const infraTypes: Incident['type'][] = ['Large Pothole', 'Open Manhole', 'Building Safety Hazard', 'Broken Traffic Signal', 'Cattle on Road'];
  const utilityTypes: Incident['type'][] = ['Sewage Overflow', 'Fallen Electric Pole', 'Power Failure'];
  const envTypes: Incident['type'][] = ['Water Contamination', 'Chemical Leak'];
  const publicSafetyTypes: Incident['type'][] = ['Dangerous Animal Attack', 'Dog Bite', 'Dead Animal Removal'];

  if (animalRescueTypes.includes(type)) return 'Animal Rescue';
  if (vetServicesTypes.includes(type)) return 'Veterinary Services';
  if (infraTypes.includes(type)) return 'Infrastructure Issues';
  if (utilityTypes.includes(type)) return 'Utility Failures';
  if (envTypes.includes(type)) return 'Environmental Hazards';
  if (publicSafetyTypes.includes(type)) return 'Public Safety';
  return 'Disaster Response';
}

// Extract report details
function extractIncidentMetadata(text: string, lat: number, lng: number, address: string): AnalysisResult {
  const lower = text.toLowerCase();
  
  let type: Incident['type'] = 'Building Collapse';
  let category: Incident['category'] = 'Disaster Response';
  let resources = ['SDRF Rescue Team', 'Ambulance'];
  
  // 1. Comprehensive Civic & Animal Classification Heuristics
  if (lower.includes('snake') || lower.includes('cobra') || lower.includes('viper') || lower.includes('python')) {
    type = 'Snake Sighting';
    category = 'Animal Rescue';
    resources = ['Wildlife Rescue Team', 'Forest Department'];
  } else if (lower.includes('monkey') || lower.includes('langur')) {
    type = 'Monkey Nuisance';
    category = 'Animal Rescue';
    resources = ['Wildlife Rescue Team', 'Municipal Animal Control'];
  } else if (lower.includes('bee') || lower.includes('wasp') || lower.includes('hornet') || lower.includes('swarm')) {
    type = 'Bee/Wasp Swarm';
    category = 'Animal Rescue';
    resources = ['Pest Control Squad'];
  } else if (lower.includes('wild animal') || lower.includes('panther') || lower.includes('leopard') || lower.includes('deer')) {
    type = 'Wild Animal Rescue';
    category = 'Animal Rescue';
    resources = ['Forest Department Ranger'];
  } else if (lower.includes('illegal wildlife') || lower.includes('poaching') || lower.includes('smuggl')) {
    type = 'Illegal Wildlife Sighting';
    category = 'Animal Rescue';
    resources = ['Wildlife Crime Control Cell'];
  } else if (lower.includes('dangerous animal') || lower.includes('animal attack') || lower.includes('stray attack')) {
    type = 'Dangerous Animal Attack';
    category = 'Public Safety';
    resources = ['Municipal Corporation Patrol'];
  } else if (lower.includes('dog bite') || lower.includes('rabid dog') || lower.includes('stray dog bite')) {
    type = 'Dog Bite';
    category = 'Public Safety';
    resources = ['Veterinary Medical Response'];
  } else if (lower.includes('cattle') || lower.includes('cow') || lower.includes('buffalo') || lower.includes('road block cattle')) {
    type = 'Cattle on Road';
    category = 'Infrastructure Issues';
    resources = ['Municipal Cattle Evacuation Unit'];
  } else if (lower.includes('injured stray') || lower.includes('hurt dog') || lower.includes('injured cow')) {
    type = 'Injured Stray Animal';
    category = 'Veterinary Services';
    resources = ['Veterinary Rescue Van', 'Animal Welfare NGO'];
  } else if (lower.includes('veterinary emergency') || lower.includes('animal emergency')) {
    type = 'Veterinary Emergency';
    category = 'Veterinary Services';
    resources = ['Mobile Vet Clinic'];
  } else if (lower.includes('animal disease') || lower.includes('bird flu') || lower.includes('cattle outbreak')) {
    type = 'Animal Disease Outbreak';
    category = 'Veterinary Services';
    resources = ['Veterinary Disease Surveillance Team'];
  } else if (lower.includes('dead animal') || lower.includes('animal carcass') || lower.includes('carcass removal')) {
    type = 'Dead Animal Removal';
    category = 'Public Safety';
    resources = ['Municipal Sanitation Crew'];
  } else if (lower.includes('water contamination') || lower.includes('contaminated water') || lower.includes('poisoned well')) {
    type = 'Water Contamination';
    category = 'Environmental Hazards';
    resources = ['State Water Quality Lab', 'Water Supply Board'];
  } else if (lower.includes('sewage') || lower.includes('sewer overflow') || lower.includes('drain block')) {
    type = 'Sewage Overflow';
    category = 'Utility Failures';
    resources = ['Municipal Sewage Maintenance'];
  } else if (lower.includes('electric pole') || lower.includes('broken cable') || lower.includes('fallen wire')) {
    type = 'Fallen Electric Pole';
    category = 'Utility Failures';
    resources = ['TS-SPDCL Power Utility Team'];
  } else if (lower.includes('traffic signal') || lower.includes('traffic light') || lower.includes('signal broken')) {
    type = 'Broken Traffic Signal';
    category = 'Infrastructure Issues';
    resources = ['Traffic Control Maintenance'];
  } else if (lower.includes('pothole') || lower.includes('crater') || lower.includes('broken road')) {
    type = 'Large Pothole';
    category = 'Infrastructure Issues';
    resources = ['GHMC Road Maintenance Crew'];
  } else if (lower.includes('manhole') || lower.includes('open drain')) {
    type = 'Open Manhole';
    category = 'Infrastructure Issues';
    resources = ['GHMC Drainage Inspector'];
  } else if (lower.includes('building safety') || lower.includes('structural cracks') || lower.includes('hazard house')) {
    type = 'Building Safety Hazard';
    category = 'Infrastructure Issues';
    resources = ['GHMC Town Planning Inspectors'];
  } else if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burn')) {
    type = 'Fire';
    category = 'Disaster Response';
    resources = ['Fire Truck', 'Water Tender', 'Ambulance'];
  } else if (lower.includes('flood') || lower.includes('water') || lower.includes('overflow') || lower.includes('inundat')) {
    type = 'Flood';
    category = 'Disaster Response';
    resources = ['NDRF Rescue Boat', 'SDRF Evacuation Team'];
  } else if (lower.includes('landslide') || lower.includes('mudslide') || lower.includes('rockfall')) {
    type = 'Landslide';
    category = 'Disaster Response';
    resources = ['Bulldozer Unit', 'TG-Police Patrol'];
  } else if (lower.includes('chemical') || lower.includes('gas') || lower.includes('leak') || lower.includes('toxic')) {
    type = 'Chemical Leak';
    category = 'Environmental Hazards';
    resources = ['SDRF Hazmat Team', 'Fire Truck', 'Ambulance'];
  } else if (lower.includes('accident') || lower.includes('collision') || lower.includes('crash')) {
    type = 'Road Blockage';
    category = 'Infrastructure Issues';
    resources = ['TG-Police Patrol', 'Ambulance', 'Highway Patrol'];
  } else if (lower.includes('tree') || lower.includes('storm') || lower.includes('wind')) {
    type = 'Fallen Trees';
    category = 'Infrastructure Issues';
    resources = ['Road Clearance', 'Utility Repair'];
  } else if (lower.includes('power') || lower.includes('grid') || lower.includes('outage') || lower.includes('blackout')) {
    type = 'Power Failure';
    category = 'Utility Failures';
    resources = ['Utility Repair Team'];
  } else if (lower.includes('medical') || lower.includes('heart') || lower.includes('stroke') || lower.includes('breath')) {
    type = 'Medical Emergency';
    category = 'Disaster Response';
    resources = ['Ambulance', 'Mobile Medical'];
  }

  // Parse location keywords inside the transcription text to geocode correctly
  let locationName = address;
  let latVal = lat;
  let lngVal = lng;

  if (lower.includes('musi') || lower.includes('chaderghat')) {
    locationName = 'Chaderghat Musi River Basin';
    latVal = 17.3685;
    lngVal = 78.4967;
  } else if (lower.includes('secunderabad')) {
    locationName = 'Secunderabad Commercial Block';
    latVal = 17.4390;
    lngVal = 78.4980;
  } else if (lower.includes('jeedimetla')) {
    locationName = 'Jeedimetla Industrial Zone';
    latVal = 17.5186;
    lngVal = 78.4554;
  } else if (lower.includes('vikarabad') || lower.includes('ananthagiri')) {
    locationName = 'Ananthagiri Hills Ghat Road';
    latVal = 17.3300;
    lngVal = 77.9000;
  } else if (lower.includes('warangal') || lower.includes('hanamkonda')) {
    locationName = 'Warangal Station Area';
    latVal = 17.9600;
    lngVal = 79.5900;
  } else if (lower.includes('gachibowli')) {
    locationName = 'Gachibowli Cyberabad Area';
    latVal = 17.4452;
    lngVal = 78.3440;
  } else if (lower.includes('nalgonda')) {
    locationName = 'Nalgonda Bypass Hub';
    latVal = 17.0600;
    lngVal = 79.2600;
  } else if (lower.includes('khammam')) {
    locationName = 'Khammam Central Road';
    latVal = 17.2510;
    lngVal = 80.1450;
  } else if (lower.includes('suryapet')) {
    locationName = 'Suryapet Highway Junction';
    latVal = 17.1420;
    lngVal = 79.6120;
  } else if (lower.includes('hyderabad')) {
    if (type === 'Flood') {
      locationName = 'Chaderghat Musi River, Hyderabad';
      latVal = 17.3685;
      lngVal = 78.4967;
    } else {
      locationName = 'Hyderabad City Grid Center';
      latVal = 17.3850;
      lngVal = 78.4867;
    }
  }

  let severity = 50 + Math.floor(Math.random() * 35);
  if (lower.includes('critical') || lower.includes('severe') || lower.includes('urgent') || lower.includes('trapped')) {
    severity += 10;
  }
  severity = Math.min(99, severity);

  let casualtyEstimate = 0;
  if (lower.includes('casualt') || lower.includes('die') || lower.includes('dead') || lower.includes('fatal')) {
    casualtyEstimate = Math.floor(Math.random() * 3) + 1;
  }
  
  let trappedCount = 0;
  if (lower.includes('trapped') || lower.includes('stranded') || lower.includes('under debris')) {
    trappedCount = Math.floor(Math.random() * 8) + 2;
  }

  const priority = severity > 80 ? 'CRITICAL / RED' : severity > 55 ? 'HIGH / ORANGE' : 'STANDBY / YELLOW';
  const confidence = 88 + Math.floor(Math.random() * 11);

  const localIntel = getNearbyResources(latVal, lngVal, type);

  // 2. Custom detail constructors for snake/animal rescue/civic issues
  let snakeDetails;
  if (type === 'Snake Sighting') {
    const isIndoors = lower.includes('indoor') || lower.includes('kitchen') || lower.includes('house') || lower.includes('room') || lower.includes('bedroom') || lower.includes('bathroom') || lower.includes('office') || lower.includes('deemed');
    const urgency = (lower.includes('critical') || lower.includes('severe') || isIndoors ? 'High' : 'Medium') as 'Low' | 'Medium' | 'High';
    snakeDetails = {
      urgency,
      environment: isIndoors ? ('Indoors' as const) : ('Outdoors' as const),
      recommendation: 'Do not approach the reptile. Keep the door closed and sealed. Alerting the Telangana Forest Department Snake Rescue unit.'
    };
  }

  let animalRescueDetails;
  if (category === 'Veterinary Services' || type === 'Wild Animal Rescue') {
    let animalType = 'Stray Animal';
    if (lower.includes('dog')) animalType = 'Dog';
    else if (lower.includes('cat')) animalType = 'Cat';
    else if (lower.includes('cow') || lower.includes('cattle')) animalType = 'Cattle';
    else if (lower.includes('monkey')) animalType = 'Monkey';
    else if (lower.includes('bird')) animalType = 'Bird';

    animalRescueDetails = {
      animalType,
      condition: lower.includes('bleed') || lower.includes('hit') || lower.includes('hurt') ? 'Severe Trauma / Fracture' : 'Distressed',
      recommendation: `Dispatching ${resources[0]} immediately. Contacting veterinary wing.`,
      summary: `Volunteer reported a distressed ${animalType} requiring clinical support.`
    };
  }

  let civicDetails;
  if (category === 'Public Safety' || category === 'Infrastructure Issues' || category === 'Utility Failures') {
    let dept = 'Municipal Administration (GHMC)';
    if (category === 'Utility Failures') dept = 'TS-SPDCL Electrical Maintenance Division';
    if (lower.includes('traffic') || lower.includes('signal')) dept = 'TS Police Traffic Department';
    
    civicDetails = {
      recommendedDepartment: dept,
      reportSummary: `Civic issue reported: "${text.slice(0, 80)}..." routed to ${dept}.`
    };
  }

  return {
    type,
    category,
    description: text,
    severity,
    casualtyEstimate,
    trappedCount,
    requiredResources: resources,
    priority,
    actions: [
      `Dispatch emergency ${resources[0]} immediately using snapped road routes.`,
      `Alert nearest dispatch unit or department: ${localIntel.hospitals[0] || 'GHMC Emergency Staging'}.`,
      `Monitor resolution status in real time.`
    ],
    confidence,
    locationName,
    lat: latVal,
    lng: lngVal,
    nearbyHospitals: localIntel.hospitals,
    nearbyPoliceStations: localIntel.police,
    nearbyFireStations: localIntel.fire,
    nearbyShelters: localIntel.shelters,
    weather: localIntel.weather,
    populationDensity: localIntel.population,
    snakeDetails,
    animalRescueDetails,
    civicDetails
  };
}

// Local image pixel color checking for fake detection
function analyzeImagePixels(imgSrc: string): Promise<{ hasDisaster: boolean; details: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ hasDisaster: true, details: 'Standard pixel scans' });
        return;
      }
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      try {
        const imgData = ctx.getImageData(0, 0, 100, 100);
        const data = imgData.data;
        
        let redPixels = 0;
        let bluePixels = 0;
        let greyPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          // Fire color range (high red, moderate green, low blue)
          if (r > 160 && g < 120 && b < 80) {
            redPixels++;
          }
          // Water blue/muddy brown range
          if (b > 130 && r < 110) {
            bluePixels++;
          }
          // Grey debris range
          if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 80 && r < 160) {
            greyPixels++;
          }
        }
        
        const total = 100 * 100;
        const fireRatio = redPixels / total;
        const waterRatio = bluePixels / total;
        const debrisRatio = greyPixels / total;

        if (fireRatio > 0.015) {
          resolve({ hasDisaster: true, details: `Thermal hotspot signature detected (Fire pixels: ${(fireRatio * 100).toFixed(1)}%)` });
        } else if (waterRatio > 0.08) {
          resolve({ hasDisaster: true, details: `Inundation water watermark detected (Water pixels: ${(waterRatio * 100).toFixed(1)}%)` });
        } else if (debrisRatio > 0.15) {
          resolve({ hasDisaster: true, details: `Structural masonry rubble detected (Debris pixels: ${(debrisRatio * 100).toFixed(1)}%)` });
        } else {
          resolve({ hasDisaster: false, details: 'No signatures of active fire hotspots, flooding water logging, or collapsed structural concrete debris in the visual matrix.' });
        }
      } catch (e) {
        // Fallback for cross-origin canvas security blockers
        resolve({ hasDisaster: true, details: 'Security cross-origin fallback validation' });
      }
    };
    img.onerror = () => {
      resolve({ hasDisaster: true, details: 'Standard metadata signature' });
    };
  });
}

// Call Google Gemini Multimodal Vision API
async function analyzeImageWithGemini(
  base64Data: string, 
  mimeType: string, 
  apiKey: string, 
  lat: number, 
  lng: number, 
  address: string
): Promise<AnalysisResult> {
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
                text: `You are an AI disaster response agent for Telangana EOC. Analyze this uploaded image.
Determine if the image contains an active disaster (such as fire, smoke, flooding, vehicle crash, collapsed building, landslide, gas leak).
If it is a normal picture, a generic selfie, room interior, laptop, keyboard, or has no active crisis, return JSON:
{
  "isFake": true,
  "explanation": "No active disaster detected. The image appears to show [what is in image] with no signs of active threats, flames, or flooding."
}

If a real disaster is detected, return JSON:
{
  "isFake": false,
  "type": "Fire", // Choose one: Fire, Flood, Landslide, Chemical Leak, Road Accident, Fallen Trees, Power Failure, Medical Emergency
  "severity": 85, // 0-100 scale
  "casualtyEstimate": 3,
  "trappedCount": 8,
  "description": "Short explanation of the incident seen in the photo",
  "requiredResources": ["Fire Truck", "Ambulance"],
  "actions": ["Stave off structural perimeter", "Clear roadway corridor"],
  "confidence": 92
}

IMPORTANT: Output ONLY raw JSON text. Do not put markdown blocks or code formatting.`
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
    throw new Error(`Gemini API returned error code ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanedText);

  if (parsed.isFake) {
    throw new Error(`FAKE_IMAGE: ${parsed.explanation}`);
  }

  const localIntel = getNearbyResources(lat, lng, parsed.type);

  return {
    type: parsed.type,
    category: getIncidentCategory(parsed.type),
    description: parsed.description,
    severity: parsed.severity || 50,
    casualtyEstimate: parsed.casualtyEstimate || 0,
    trappedCount: parsed.trappedCount || 0,
    requiredResources: parsed.requiredResources || ['SDRF Rescue Team'],
    priority: (parsed.severity || 50) > 80 ? 'CRITICAL / RED' : 'HIGH / ORANGE',
    actions: parsed.actions || ['Coordinate responders near coordinates'],
    confidence: parsed.confidence || 90,
    locationName: address,
    lat,
    lng,
    nearbyHospitals: localIntel.hospitals,
    nearbyPoliceStations: localIntel.police,
    nearbyFireStations: localIntel.fire,
    nearbyShelters: localIntel.shelters,
    weather: localIntel.weather,
    populationDensity: localIntel.population
  };
}

function formatTimer(secs: number): string {
  const mins = Math.floor(secs / 60);
  const remaining = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
}

export default function IncidentAnalyzer({ onAddIncident, addNotification }: IncidentAnalyzerProps) {
  // Main Panel states
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Location States
  const [lat, setLat] = useState(17.3850);
  const [lng, setLng] = useState(78.4867);
  const [address, setAddress] = useState('Hyderabad Central, Telangana');
  const [city, setCity] = useState('Hyderabad');
  const [state, setState] = useState('Telangana');
  const [pincode, setPincode] = useState('500001');

  // Google Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMarkerRef = useRef<any>(null);

  // 1. Voice Report States
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceIsAnalyzing, setVoiceIsAnalyzing] = useState(false);
  const [voiceResult, setVoiceResult] = useState<AnalysisResult | null>(null);

  // 2. Upload Scan States
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanImageUrl, setScanImageUrl] = useState<string | null>(null);
  const [scanFileType, setScanFileType] = useState<'image' | 'pdf' | null>(null);
  const [scanIsAnalyzing, setScanIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<AnalysisResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<{ label: string; x: number; y: number; w: number; h: number; color: string }[]>([]);

  // Refs for audio media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const searchLocations = [
    { label: 'Chaderghat, Hyderabad', lat: 17.3685, lng: 78.4967 },
    { label: 'Jeedimetla Industrial Zone', lat: 17.5186, lng: 78.4554 },
    { label: 'Secunderabad Center', lat: 17.4390, lng: 78.4980 },
    { label: 'Ananthagiri Hills, Vikarabad', lat: 17.3300, lng: 77.9000 },
    { label: 'Hanamkonda, Warangal', lat: 17.9600, lng: 79.5900 },
    { label: 'Nalgonda Bypass Area', lat: 17.0600, lng: 79.2600 },
    { label: 'Khammam Central Road', lat: 17.2510, lng: 80.1450 },
    { label: 'Suryapet NH-65 Corridor', lat: 17.1420, lng: 79.6120 }
  ];

  // Geocoding helper
  const triggerReverseGeocode = (latitude: number, longitude: number) => {
    const presets = [
      { name: 'Chaderghat, Musi Basin', lat: 17.3685, lng: 78.4967, city: 'Hyderabad', pincode: '500024' },
      { name: 'Secunderabad Commercial Block', lat: 17.4390, lng: 78.4980, city: 'Secunderabad', pincode: '500003' },
      { name: 'Jeedimetla Industrial Area', lat: 17.5186, lng: 78.4554, city: 'Jeedimetla', pincode: '500055' },
      { name: 'Ananthagiri Hills Ghat', lat: 17.3300, lng: 77.9000, city: 'Vikarabad', pincode: '501101' },
      { name: 'Hanamkonda Central', lat: 17.9600, lng: 79.5900, city: 'Warangal', pincode: '506001' },
      { name: 'Nalgonda Bypass Road', lat: 17.0600, lng: 79.2600, city: 'Nalgonda', pincode: '508001' },
      { name: 'Khammam Main Highway', lat: 17.2510, lng: 80.1450, city: 'Khammam', pincode: '507001' },
      { name: 'Suryapet NH-65 Sector', lat: 17.1420, lng: 79.6120, city: 'Suryapet', pincode: '508213' }
    ];

    let matched = presets[0];
    let minDist = Infinity;
    presets.forEach((p) => {
      const d = Math.sqrt(Math.pow(p.lat - latitude, 2) + Math.pow(p.lng - longitude, 2));
      if (d < minDist) {
        minDist = d;
        matched = p;
      }
    });

    if (minDist < 0.08) {
      setAddress(matched.name);
      setCity(matched.city);
      setState('Telangana');
      setPincode(matched.pincode);
    } else {
      setAddress(`Sector Area, Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      setCity('Hyderabad Outskirts');
      setState('Telangana');
      setPincode('500085');
    }
  };

  const updateMapPosition = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    if (leafletMapRef.current && leafletMarkerRef.current) {
      leafletMapRef.current.setView([newLat, newLng], 13);
      leafletMarkerRef.current.setLatLng([newLat, newLng]);
    }
    triggerReverseGeocode(newLat, newLng);
  };

  const watchIdRef = useRef<number | null>(null);

  const handleUseCurrentLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      // Clear any existing watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          updateMapPosition(latitude, longitude);
        },
        (err) => {
          console.error("EOC GPS tracking error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      watchIdRef.current = id;
    }
  };

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Mount settings & keys checklist
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        setGeminiApiKey(stored);
      }
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  const handleApiKeyChange = (val: string) => {
    setGeminiApiKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', val);
    }
  };

  // Leaflet Mini Map Initializer
  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mapInstance: any = null;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      if (!leafletMapRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 11,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setLat(pos.lat);
          setLng(pos.lng);
          triggerReverseGeocode(pos.lat, pos.lng);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('click', (e: any) => {
          const pos = e.latlng;
          marker.setLatLng(pos);
          setLat(pos.lat);
          setLng(pos.lng);
          triggerReverseGeocode(pos.lat, pos.lng);
        });

        leafletMapRef.current = map;
        leafletMarkerRef.current = marker;
        mapInstance = map;
      }
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletMarkerRef.current = null;
      } else if (mapInstance) {
        mapInstance.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Voice report recording loops
  const handleStartRecording = async () => {
    setAudioUrl(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    setTranscription('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState('recording');

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      if (recognitionRef.current) recognitionRef.current.start();
    } catch (err) {
      console.warn("Microphone access blocked. Generating simulated address report.", err);
      setRecordingState('recording');
      let count = 0;
      
      const geoSpeechTemplates = [
        `Operational voice report logs: Active industrial crisis here at ${address} in ${city}. We register hazardous emissions. Dispatch emergency units.`,
        `Calling EOC from NH Road sector near ${address}, ${city}. A crash collision occurred. Traffic is blocked. Send an ambulance.`,
        `Low-lying urban flooding registered at Musi River near ${address}. Water level overflowing. Stranded residents require boat evacuations.`
      ];
      
      const textTemplate = geoSpeechTemplates[Math.floor(Math.random() * geoSpeechTemplates.length)];
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
        count++;
        if (count < 8) {
          setTranscription(textTemplate.split(' ').slice(0, count * 5).join(' ') + '...');
        } else {
          setTranscription(textTemplate);
        }
      }, 1000);
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    } else if (recordingState === 'paused') {
      if (mediaRecorderRef.current) mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      if (recognitionRef.current) recognitionRef.current.start();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecordingState('review');

    if (!transcription) {
      setTranscription(`Active voice telemetry report compiled from geocoded sector: ${address}, ${city}. Ground units report incident activated.`);
    }
  };

  const submitVoiceAnalysis = () => {
    setVoiceIsAnalyzing(true);
    setVoiceResult(null);
    setTimeout(() => {
      const parsed = extractIncidentMetadata(transcription, lat, lng, address);
      setVoiceResult(parsed);
      setVoiceIsAnalyzing(false);
    }, 1500);
  };

  const handleVoiceApprove = () => {
    if (voiceResult) {
      onAddIncident({
        type: voiceResult.type,
        category: voiceResult.category,
        severity: voiceResult.severity,
        location: { lat: voiceResult.lat, lng: voiceResult.lng },
        description: voiceResult.description,
        casualtyEstimate: voiceResult.casualtyEstimate,
        trappedCount: voiceResult.trappedCount,
        requiredResources: voiceResult.requiredResources,
        reporter: 'Emergency Patrol',
        aiPriority: voiceResult.priority.includes('CRITICAL') ? 'CRITICAL' : voiceResult.priority.includes('HIGH') ? 'HIGH' : voiceResult.priority.includes('STANDBY') ? 'LOW' : 'MEDIUM',
        etaResolution: Math.ceil(voiceResult.severity / 25),
        status: voiceResult.type === 'Snake Sighting' ? 'Reported' : 'Pending',
        snakeDetails: voiceResult.snakeDetails,
        animalRescueDetails: voiceResult.animalRescueDetails,
        civicDetails: voiceResult.civicDetails,
      });
      setVoiceModalOpen(false);
      setRecordingState('idle');
      setTranscription('');
      setVoiceResult(null);
    }
  };

  // Upload Scan Handlers
  const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanFileType(file.type.includes('pdf') ? 'pdf' : 'image');
    const reader = new FileReader();
    reader.onload = () => {
      setScanImageUrl(reader.result as string);
      setScanModalOpen(true);
      triggerScanAnalysis(reader.result as string, file.type.includes('pdf') ? 'pdf' : 'image');
    };
    reader.readAsDataURL(file);
  };

  const triggerScanAnalysis = async (imgUrl: string, type: 'image' | 'pdf') => {
    setScanIsAnalyzing(true);
    setScanResult(null);
    setScanError(null);
    setBoundingBoxes([]);

    // 1. Google Gemini API Call if Key is Present
    if (geminiApiKey.trim()) {
      try {
        const parsed = await analyzeImageWithGemini(imgUrl, 'image/jpeg', geminiApiKey, lat, lng, address);
        setScanResult(parsed);
        setScanIsAnalyzing(false);
      } catch (err) {
        console.error("Gemini API scanning failed:", err);
        const errMsg = err instanceof Error ? err.message : 'Failed to communicate with Google Gemini API.';
        setScanError(errMsg);
        setScanIsAnalyzing(false);
      }
      return;
    }

    // 2. Local Canvas Pixel validation fallback if no key
    if (type === 'image') {
      const validation = await analyzeImagePixels(imgUrl);
      if (!validation.hasDisaster) {
        setTimeout(() => {
          setScanError(`CRITICAL DETECTOR ALARM: FAKE / NON-DISASTER EVIDENCE INDEX DETECTED. Reason: ${validation.details}`);
          setScanIsAnalyzing(false);
        }, 1500);
        return;
      }
    }

    // Standard preset segmentation loop
    setTimeout(() => {
      const presets = [
        {
          type: 'Flood' as const,
          description: 'High-resolution scan analysis: Musi river banks overflowing. Flood level watermark registered at +1.8m. low-lying roads blocked.',
          severity: 85,
          bboxes: [
            { label: 'Waterlogging / Flooding', x: 10, y: 40, w: 80, h: 50, color: 'border-cyan-500 text-cyan-400' },
            { label: 'Stranded Vehicles', x: 30, y: 65, w: 25, h: 15, color: 'border-red-500 text-red-400' }
          ]
        },
        {
          type: 'Fire' as const,
          description: 'Satellite thermal image scan: Flame burst signatures registered in chemical warehouse sector. Plume column height: 18m.',
          severity: 92,
          bboxes: [
            { label: 'Active Fire Flame', x: 20, y: 15, w: 45, h: 40, color: 'border-red-500 text-red-400' },
            { label: 'Toxic Smoke Plume', x: 5, y: 5, w: 85, h: 30, color: 'border-orange-500 text-orange-400' }
          ]
        },
        {
          type: 'Building Collapse' as const,
          description: 'Infrastructural drone scan: roof slab collapse. Structural displacement vector: 1.4m.',
          severity: 78,
          bboxes: [
            { label: 'Structural Concrete Rubble', x: 15, y: 35, w: 70, h: 55, color: 'border-amber-500 text-amber-400' }
          ]
        }
      ];

      const selected = presets[Math.floor(Math.random() * presets.length)];
      const parsed = extractIncidentMetadata(selected.description, lat, lng, address);
      
      setScanResult({
        ...parsed,
        type: selected.type,
        description: type === 'pdf' ? `Document Text: ${selected.description}` : selected.description,
        severity: selected.severity,
        confidence: 94 + Math.floor(Math.random() * 5)
      });
      setBoundingBoxes(selected.bboxes);
      setScanIsAnalyzing(false);
    }, 2800);
  };

  const handleScanApprove = () => {
    if (scanResult) {
      onAddIncident({
        type: scanResult.type,
        category: scanResult.category,
        severity: scanResult.severity,
        location: { lat: scanResult.lat, lng: scanResult.lng },
        description: scanResult.description,
        casualtyEstimate: scanResult.casualtyEstimate,
        trappedCount: scanResult.trappedCount,
        requiredResources: scanResult.requiredResources,
        reporter: 'Satellite',
        aiPriority: scanResult.priority.includes('CRITICAL') ? 'CRITICAL' : scanResult.priority.includes('HIGH') ? 'HIGH' : scanResult.priority.includes('STANDBY') ? 'LOW' : 'MEDIUM',
        etaResolution: Math.ceil(scanResult.severity / 25),
        status: scanResult.type === 'Snake Sighting' ? 'Reported' : 'Pending',
        snakeDetails: scanResult.snakeDetails,
        animalRescueDetails: scanResult.animalRescueDetails,
        civicDetails: scanResult.civicDetails,
      });
      setScanModalOpen(false);
      setScanResult(null);
      setScanImageUrl(null);
    }
  };

  const startAnalysis = (incidentText: string) => {
    setIsAnalyzing(true);
    setResult(null);
    setAnalysisLogs([]);

    const logs = [
      '📡 CONNECTING TO TSDMA NEURAL NET...',
      '🔍 EXTRACTING VOCABULARY TOKEN ENTITIES...',
      '🌐 RESOLVING GEOLOCATION MAP COORDINATES...',
      '📊 ESTIMATING INJURIES AND RESOURCE STAGING MATRIX...',
      '✅ REPORT COMPILED SUCCESSFULLY.'
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setAnalysisLogs((prev) => [...prev, log]);
        if (index === logs.length - 1) {
          const parsed = extractIncidentMetadata(incidentText, lat, lng, address);
          setResult(parsed);
          setIsAnalyzing(false);
        }
      }, (index + 1) * 350);
    });
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    startAnalysis(inputText);
  };

  const handlePresetSelect = (preset: typeof PRESET_DISASTERS[0]) => {
    setInputText(preset.description);
    updateMapPosition(preset.lat, preset.lng);
    setAddress(preset.locationName);
    startAnalysis(preset.description);
  };

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-8 relative overflow-y-auto pr-2 pb-6">
      <style jsx>{`
        @keyframes scan-sweep {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
        .laser-scan-line {
          animation: scan-sweep 3s ease-in-out infinite;
        }
        @keyframes waveform-pulse {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
        .waveform-bar {
          animation: waveform-pulse 1.2s ease-in-out infinite;
        }
        /* Hide number input spinners */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-radar-spin {
          animation: radar-spin 4s linear infinite;
        }
      `}</style>

      {/* Left panel: Input Area */}
      <div className="flex flex-col space-y-6">
        
        {/* Section 1: Location Information Card */}
        <div className="premium-card p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400 font-mono">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Scene Geolocation Context</span>
          </div>
           <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            
            {/* Left side: Mini Map container (col-span-2) */}
            <div className="lg:col-span-2 flex flex-col space-y-2">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Mini Map Selector</span>
              <div 
                ref={mapContainerRef} 
                className="h-40 rounded-xl overflow-hidden border border-white/10 bg-zinc-950 relative z-10 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
              />
              <span className="text-[8.5px] text-zinc-500 font-mono leading-tight">
                ℹ️ Drag the marker or click on map to refine the coordinate bounds.
              </span>
            </div>

            {/* Right side: Location Fields form (col-span-3) */}
            <div className="lg:col-span-3 space-y-3 font-mono text-[10px]">
              
              {/* Search Preset dropdown */}
              <div className="space-y-1">
                <span className="text-zinc-500 uppercase flex items-center gap-1"><Search className="w-3 h-3 text-cyan-400" /> Search Location</span>
                <div className="relative">
                  <select 
                    onChange={(e) => {
                      const selected = searchLocations.find(l => l.label === e.target.value);
                      if (selected) {
                        updateMapPosition(selected.lat, selected.lng);
                      }
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 pr-8 text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none transition-colors"
                  >
                    <option value="">-- Choose Telangana Sector --</option>
                    {searchLocations.map((loc, i) => (
                      <option key={i} value={loc.label}>{loc.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-cyan-400">
                    <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-zinc-500 uppercase">Latitude</span>
                  <input 
                    type="number" 
                    value={lat} 
                    onChange={(e) => updateMapPosition(parseFloat(e.target.value) || lat, lng)}
                    step="0.0001"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 uppercase">Longitude</span>
                  <input 
                    type="number" 
                    value={lng} 
                    onChange={(e) => updateMapPosition(lat, parseFloat(e.target.value) || lng)}
                    step="0.0001"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono" 
                  />
                </div>
              </div>

              {/* GPS button */}
              <button 
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full py-2 bg-cyan-950/40 border border-cyan-800/30 hover:bg-cyan-900/40 text-cyan-400 rounded-lg text-[9px] uppercase font-bold flex items-center justify-center gap-1.5 transition-colors shadow-inner"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Use Current Location</span>
              </button>
            </div>
          </div>

          {/* Detailed Address Grid */}
          <div className="grid grid-cols-3 gap-3 font-mono text-[9px] border-t border-white/5 pt-3">
            <div className="col-span-3 space-y-1">
              <span className="text-zinc-500 uppercase">Address Line</span>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all" 
              />
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase">City</span>
              <input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all" 
              />
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase">Pincode</span>
              <input 
                type="text" 
                value={pincode} 
                onChange={(e) => setPincode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all" 
              />
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase">State</span>
              <input 
                type="text" 
                value={state} 
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-zinc-500 font-bold focus:outline-none" 
                disabled 
              />
            </div>
          </div>
        </div>


        {/* Section 3: Evidence Upload & Input */}
        <div className="premium-card p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400 font-mono">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Disaster Evidence Submission</span>
          </div>

          <form onSubmit={handleSubmitText} className="space-y-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter details of active crisis (flooding, fires, roadblocks)..."
              className="w-full h-24 bg-zinc-950/70 border border-white/10 rounded-lg p-3 text-xs font-mono text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(true)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-slate-500 rounded-lg text-[10px] font-mono text-slate-300 transition"
                >
                  <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  <span>VOICE REPORT</span>
                </button>

                <div className="relative">
                  <input
                    type="file"
                    id="incident-file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={handleScanFileChange}
                  />
                  <label
                    htmlFor="incident-file"
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-slate-500 rounded-lg text-[10px] font-mono text-slate-300 cursor-pointer transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>UPLOAD SCAN</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || !inputText.trim()}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold rounded-lg text-xs font-mono transition"
              >
                ANALYZE EVIDENCE
              </button>
            </div>
          </form>
        </div>

        {/* Section 4: Presets */}
        <div className="premium-card p-5 rounded-2xl border border-white/5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-3 border-b border-white/5 pb-1.5">Simulate Satellite Presets</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {PRESET_DISASTERS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(preset)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 p-2.5 rounded-lg text-left text-[10px] font-mono transition group"
              >
                <div className="flex justify-between items-center text-cyan-400 mb-1">
                  <span className="font-semibold">{preset.type}</span>
                  <span className="text-[9px] px-1 bg-cyan-950 text-cyan-300 rounded">{preset.severity}%</span>
                </div>
                <p className="text-slate-400 line-clamp-2 leading-tight group-hover:text-slate-200">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Output Console */}
      <div className="glass-panel p-5 rounded-xl flex flex-col justify-between max-h-[85vh] overflow-y-auto relative">
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-emerald-400 font-mono border-b border-white/5 pb-2">
            <ShieldAlert className="w-5 h-5 animate-pulse text-emerald-400" />
            <span className="text-sm font-bold tracking-wider uppercase">Neural Network Output Console</span>
          </div>

          {/* Loading Logs State with Laser Scanner Line */}
          {isAnalyzing && (
            <div className="flex flex-col justify-center items-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="w-full max-w-sm bg-black/40 border border-cyan-500/20 p-3 rounded-lg font-mono text-[9px] text-cyan-400 space-y-1 overflow-hidden relative min-h-[160px] shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                {/* Glowing Scanner Line */}
                <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent laser-scan-line z-25 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                {analysisLogs.map((log, i) => (
                  <div key={i} className="animate-fade-in truncate z-10 relative">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Redesigned Radar Standby State */}
          {!isAnalyzing && !result && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-5 relative overflow-hidden w-full">
              {/* Radar circular sweep */}
              <div className="relative w-36 h-36 rounded-full border border-cyan-500/10 flex items-center justify-center overflow-hidden bg-black/30 shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_75%)]" />
                {/* Sweep lines */}
                <div className="absolute w-[180px] h-[180px] bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent rounded-full animate-radar-spin" style={{ transformOrigin: 'center' }} />
                {/* Pulsing blips */}
                <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400/50 blur-[1px] animate-ping" style={{ top: '35%', left: '42%' }} />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-500/80 animate-pulse" style={{ top: '65%', left: '72%' }} />
                
                {/* Tactical grid rings */}
                <div className="absolute w-24 h-24 rounded-full border border-white/5" />
                <div className="absolute w-12 h-12 rounded-full border border-white/5" />
                {/* Crosshair lines */}
                <div className="absolute w-full h-[1px] bg-white/5" />
                <div className="absolute h-full w-[1px] bg-white/5" />
                
                <Upload className="w-8 h-8 text-cyan-400/40 relative z-10 animate-bounce" />
              </div>

              <div className="space-y-1.5 relative z-10">
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest font-mono">Cognitive Neural Standby</p>
                <p className="text-[10px] text-slate-500 font-mono max-w-xs leading-normal">
                  Waiting for telemetry scan data. Submit disaster logs or select a satellite preset on the left interface to initiate neural analysis.
                </p>
              </div>

              {/* Simulated active telemetry streams */}
              <div className="w-full max-w-sm bg-black/30 border border-white/5 p-3 rounded-lg font-mono text-[8px] text-slate-650 space-y-0.5 text-left h-24 overflow-hidden relative">
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
                <div>[SYS] COGNITIVE NEURAL ENGINE STANDBY...</div>
                <div>[SYS] READY FOR MULTI-MODAL SCANS</div>
                <div>[SYS] CORE STACK LEVEL: STATUS_OK</div>
                <div>[SYS] GEOMAPPING UTILITY: ACTIVE [TS_EOC]</div>
                <div>[SYS] SATELLITE CHANNELS: CONNECTED</div>
                <div>[SYS] SENSOR THREADS: MONITORING INFLOWS</div>
              </div>
            </div>
          )}

          {/* Results State */}
          {!isAnalyzing && result && (
            <div className="space-y-5 font-mono text-xs">
              
              {/* Core Parameters card */}
              <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/5 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-500 uppercase">Classified Hazard</div>
                  <div className="text-xs font-bold text-white uppercase">{result.type}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-500 uppercase">Severity Indicator</div>
                  <div className="text-xs font-bold text-orange-400">{result.severity} / 100</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-500 uppercase">Operational Priority</div>
                  <div className={`text-[10px] font-bold ${result.severity > 80 ? 'text-red-400' : 'text-orange-400'}`}>{result.priority}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-500 uppercase">Casualties Forecast</div>
                  <div className="text-xs font-bold text-white">{result.casualtyEstimate} Estimated</div>
                </div>
              </div>

              {/* Dynamic Local Scene Intelligence section */}
              <div className="premium-card p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center space-x-1.5 text-cyan-400 uppercase tracking-widest text-[9px] border-b border-white/5 pb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Local Scene Intelligence Context</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-slate-300">
                  <div className="space-y-1.5">
                    <div>📍 geocoded sector: <span className="text-white block font-bold">{result.locationName}</span></div>
                    <div>👥 population density: <span className="text-white block">{result.populationDensity}</span></div>
                    <div className="flex items-center gap-1">☁️ local weather: <span className="text-white font-bold">{result.weather}</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <div>🏥 nearest hospital: <span className="text-red-400 block font-semibold">{result.nearbyHospitals[0]}</span></div>
                    <div>🚒 nearest fire engine: <span className="text-orange-400 block font-semibold">{result.nearbyFireStations[0]}</span></div>
                    <div>🚓 police coordinates: <span className="text-blue-400 block font-semibold">{result.nearbyPoliceStations[0]}</span></div>
                  </div>
                </div>
              </div>

              {/* Actions & Logistics */}
              <div className="space-y-2">
                <div className="text-[9px] text-slate-500 uppercase">Tactical Actions Required</div>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  {result.actions.map((act: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-cyan-400 mt-0.5">▪</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] text-slate-500 uppercase">Assigned Logistical Resource</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.requiredResources.map((res: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-[9px] rounded font-bold uppercase tracking-wider">
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {result && !isAnalyzing && (
          <button
            onClick={() => {
              onAddIncident({
                type: result.type,
                category: result.category,
                severity: result.severity,
                location: { lat: result.lat, lng: result.lng },
                description: result.description,
                casualtyEstimate: result.casualtyEstimate,
                trappedCount: result.trappedCount,
                requiredResources: result.requiredResources,
                reporter: 'Satellite',
                aiPriority: result.priority.includes('CRITICAL') ? 'CRITICAL' : result.priority.includes('HIGH') ? 'HIGH' : result.priority.includes('STANDBY') ? 'LOW' : 'MEDIUM',
                etaResolution: Math.ceil(result.severity / 25),
                status: result.type === 'Snake Sighting' ? 'Reported' : 'Pending',
                snakeDetails: result.snakeDetails,
                animalRescueDetails: result.animalRescueDetails,
                civicDetails: result.civicDetails,
              });
              setResult(null);
              setInputText('');
            }}
            className="w-full mt-6 flex items-center justify-center space-x-2 py-3 bg-red-950 border border-red-500/50 hover:bg-red-900/60 text-red-200 font-bold rounded-lg text-xs font-mono transition"
          >
            <Send className="w-4 h-4" />
            <span>PUSH TO COMMAND CENTER & DISPATCH VEHICLES</span>
          </button>
        )}
      </div>

      {/* 1. VOICE REPORT MODAL */}
      {voiceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => { setVoiceModalOpen(false); setRecordingState('idle'); }} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-cyan-400 font-mono">
              <Mic className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider">AI Tactical Voice Reporter</span>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
              {recordingState === 'idle' && (
                <>
                  <div className="w-20 h-20 rounded-full bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <Mic className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-zinc-400 font-mono text-center">
                    Click Record to begin dispatch audio transmission.<br/>
                    <span className="text-[10px] text-zinc-500">Report location: {address}</span>
                  </p>
                  <button 
                    onClick={handleStartRecording}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs font-mono rounded-lg tracking-widest uppercase"
                  >
                    START RECORDING
                  </button>
                </>
              )}

              {recordingState === 'recording' && (
                <>
                  <div className="flex items-center space-x-1.5 h-16">
                    <span className="w-1.5 bg-cyan-500 rounded-full waveform-bar" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-1.5 bg-cyan-400 rounded-full waveform-bar" style={{ animationDelay: '0.3s' }}></span>
                    <span className="w-1.5 bg-cyan-300 rounded-full waveform-bar" style={{ animationDelay: '0.5s' }}></span>
                    <span className="w-1.5 bg-cyan-400 rounded-full waveform-bar" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 bg-cyan-500 rounded-full waveform-bar" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  
                  <div className="text-lg font-bold text-white font-mono">{formatTimer(recordingSeconds)}</div>
                  <p className="text-[10px] text-zinc-500 font-mono animate-pulse uppercase">TRANSMITTING SECURE AUDIO VECTOR...</p>

                  <div className="flex space-x-3">
                    <button 
                      onClick={handlePauseRecording}
                      className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleStopRecording}
                      className="p-3 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-200 rounded-full transition"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {recordingState === 'paused' && (
                <>
                  <div className="text-lg font-bold text-zinc-500 font-mono">{formatTimer(recordingSeconds)} (PAUSED)</div>
                  <p className="text-[10px] text-zinc-500 font-mono">Audio recording temporarily suspended.</p>

                  <div className="flex space-x-3">
                    <button 
                      onClick={handlePauseRecording}
                      className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs font-mono rounded-lg transition"
                    >
                      RESUME
                    </button>
                    <button 
                      onClick={handleStopRecording}
                      className="p-3 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-200 rounded-full transition"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {recordingState === 'review' && (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] text-zinc-500 font-mono">REVIEW AUDIO TRANSMISSION</span>
                    <button 
                      onClick={handleStartRecording}
                      className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 font-mono"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-record
                    </button>
                  </div>

                  {audioUrl && (
                    <audio src={audioUrl} controls className="w-full h-8 bg-zinc-950 rounded-lg" />
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-500 font-mono block">AI TRANSCRIPTION OUTLINE (Editable)</label>
                    <textarea 
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      className="w-full h-24 bg-zinc-950 border border-white/10 rounded-lg p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button 
                    onClick={submitVoiceAnalysis}
                    disabled={voiceIsAnalyzing || !transcription}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs font-mono rounded-lg flex items-center justify-center gap-2"
                  >
                    {voiceIsAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>RUNNING NEURAL ANNOTATION...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>ANALYZE WITH AI</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {voiceResult && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-[10px] text-emerald-400 border-b border-white/5 pb-1">
                  <span>AI REPORT CLASSIFIED SUCCESSFULLY</span>
                  <span>CONFIDENCE: {voiceResult.confidence}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>DISASTER CLASS: <span className="text-white font-bold block">{voiceResult.type}</span></div>
                  <div>SEVERITY REGISTER: <span className="text-orange-400 font-bold block">{voiceResult.severity}/100</span></div>
                  <div>FORECAST CASUALTIES: <span className="text-white block">{voiceResult.casualtyEstimate} Estimated</span></div>
                  <div>GEOCODED ZONE: <span className="text-cyan-400 font-bold block">{voiceResult.locationName}</span></div>
                </div>

                <div className="text-[10px] text-zinc-400 space-y-0.5 border-t border-white/5 pt-2">
                  <span className="font-bold text-zinc-500">RECOMMENDED DISPATCH VECTOR:</span>
                  <p className="text-cyan-300 leading-snug">{voiceResult.requiredResources.join(' + ')}</p>
                </div>

                <button 
                  onClick={handleVoiceApprove}
                  className="w-full mt-2 py-2 bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-200 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>APPROVE & DISPATCH TO LIVE MAP</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. UPLOAD SCAN ANALYSIS MODAL */}
      {scanModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { setScanModalOpen(false); setScanImageUrl(null); setScanResult(null); setScanError(null); }} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider block">Scan Source Preview</span>
              <div className="relative rounded-xl border border-white/5 bg-black/40 overflow-hidden flex items-center justify-center h-80">
                {scanImageUrl && scanFileType === 'image' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scanImageUrl} alt="Uploaded Disaster Scan" className="max-w-full max-h-full object-contain" />
                    
                    {scanIsAnalyzing && (
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent laser-scan-line shadow-[0_0_12px_#22d3ee]"></div>
                    )}

                    {!scanIsAnalyzing && !scanError && boundingBoxes.map((box, i) => (
                      <div 
                        key={i}
                        className={`absolute border-2 ${box.color} p-1 text-[8px] font-mono font-bold bg-black/60 shadow-lg`}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.w}%`,
                          height: `${box.h}%`
                        }}
                      >
                        {box.label}
                      </div>
                    ))}
                  </div>
                )}

                {scanFileType === 'pdf' && (
                  <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center text-zinc-500 font-mono">
                    <FileText className="w-16 h-16 text-cyan-500 animate-bounce" />
                    <span className="text-xs text-zinc-400">PDF Report Document Uploaded</span>
                    <span className="text-[9px] text-zinc-600">Extracting raw document formatting tables...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 font-mono mb-4">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">Vision-Language Model output</span>
                </div>

                {scanIsAnalyzing && (
                  <div className="space-y-4 py-8 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                    <p className="text-xs text-cyan-300 font-mono animate-pulse">SEGMENTING IMAGE MATRICES & RUNNING THERMAL BOUNDING BOX CORRIDORS...</p>
                  </div>
                )}

                {/* Warning / Error UI Case for Fake or Non-Disaster Images */}
                {scanError && !scanIsAnalyzing && (
                  <div className="bg-red-950/60 border border-red-500/50 p-4 rounded-xl space-y-3 font-mono">
                    <div className="flex items-center space-x-2 text-red-400 font-bold">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                      <span className="text-xs uppercase">EOC IMAGE AUDITING REJECTION</span>
                    </div>
                    <p className="text-[10px] text-red-200 leading-relaxed">
                      {scanError}
                    </p>
                    <div className="text-[9px] text-zinc-500 pt-2 border-t border-white/5">
                      ⚠️ Submission logs have flagged this evidence validation vector. Real EOC parameters require active fire/flood pixel indexes or Gemini validation pass.
                    </div>
                  </div>
                )}

                {scanResult && !scanIsAnalyzing && !scanError && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 p-3 rounded-lg">
                      <div>DISASTER CLASS: <span className="text-white font-bold block">{scanResult.type}</span></div>
                      <div>SEVERITY SCALE: <span className="text-orange-400 font-bold block">{scanResult.severity}/100</span></div>
                      <div>FORECAST CASUALTIES: <span className="text-white block">{scanResult.casualtyEstimate} Estimated</span></div>
                      <div>AI CONFIDENCE: <span className="text-emerald-400 font-bold block">{scanResult.confidence}% ACCURACY</span></div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase">ANALYSIS EXPLANATION SUMMARY</span>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">{scanResult.description}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase">GEOCODED DISASTER COORDINATES</span>
                      <p className="text-cyan-400 font-bold">{scanResult.locationName} ({scanResult.lat.toFixed(4)}, {scanResult.lng.toFixed(4)})</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase">SUGGESTED DISPATCH VECTORS</span>
                      <div className="flex gap-1.5">
                        {scanResult.requiredResources.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-[10px] rounded">{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!scanIsAnalyzing && (scanResult || scanError) && (
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => triggerScanAnalysis(scanImageUrl || '', scanFileType || 'image')}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:border-slate-500 text-slate-300 text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>RE-SCAN</span>
                  </button>
                  {scanResult && !scanError && (
                    <button 
                      onClick={handleScanApprove}
                      className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>APPROVE & DISPATCH</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
