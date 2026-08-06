'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Check, Wind, Droplets, X } from 'lucide-react';
import { Location, Incident, Vehicle, Shelter, Hospital, Warehouse, defaultPoliceStations, defaultFireStations } from '../utils/mockData';
import { generateOptimizedPath, simulateThreatGrowth, getDistance } from '../utils/routing';

interface CommandMapProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  hospitals: Hospital[];
  warehouses: Warehouse[];
  hazards: { id: string; type: string; location: Location; radiusKm: number }[];
  roadClosures: Location[];
  onToggleRoadClosure: (loc: Location) => void;
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  forecastHours?: number;
  onForecastHoursChange?: (hours: number) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Map events handler to allow clicks on map to set road blockages
function MapEventsHandler({ onMapClick }: { onMapClick: (loc: Location) => void }) {
  const map = useMap();
  useEffect(() => {
    map.on('click', (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return () => {
      map.off('click');
    };
  }, [map, onMapClick]);
  return null;
}

// Center map view on selected incident using smooth flyTo transitions based on incident type size
function MapCenterHandler({
  selectedIncident,
  selectedVehicle,
  userLocation,
}: {
  selectedIncident: Incident | null;
  selectedVehicle: Vehicle | null;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, {
        animate: true,
        duration: 1.5,
      });
    } else if (selectedIncident) {
      // Step 3: Determine zoom depending on disaster size
      let zoom = 15; // default
      if (selectedIncident.type === 'Building Collapse' || selectedIncident.type === 'Road Blockage' || selectedIncident.type === 'Medical Emergency') {
        zoom = 16; // Close-up focus
      } else if (selectedIncident.type === 'Flood') {
        zoom = 12; // Medium overview
      } else if (selectedIncident.type === 'Cyclone') {
        zoom = 9;  // Wide regional view
      } else if (selectedIncident.type === 'Fire' || selectedIncident.type === 'Chemical Leak') {
        zoom = 14; // Area-based view
      }
      
      // Step 2: Smooth Fly-to easement transition
      map.flyTo([selectedIncident.location.lat, selectedIncident.location.lng], zoom, {
        animate: true,
        duration: 2.0, // 2-second flight time
      });
    } else if (selectedVehicle) {
      // Step 3: Smooth fly-to vehicle coordinate zoom (close focus)
      map.flyTo([selectedVehicle.location.lat, selectedVehicle.location.lng], 16, {
        animate: true,
        duration: 2.0,
      });
    }
  }, [selectedIncident, selectedVehicle, userLocation, map]);
  return null;
}

// Viewport Boundary Tracker Sub-Component
function ViewportTracker({
  onBoundsChange,
  onZoomChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onBoundsChange(map.getBounds());
    onZoomChange(map.getZoom());
  }, [map, onBoundsChange, onZoomChange]);

  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
      onZoomChange(map.getZoom());
    },
  });

  return null;
}

// District polygon bounds approximation for major Telangana sectors
const DISTRICT_BOUNDS = [
  {
    name: 'Hyderabad Central (Musi Basin)',
    coords: [
      [17.30, 78.35],
      [17.50, 78.35],
      [17.50, 78.58],
      [17.30, 78.58]
    ] as [number, number][],
    color: '#06b6d4'
  },
  {
    name: 'Warangal District Sector',
    coords: [
      [17.80, 79.40],
      [18.15, 79.40],
      [18.15, 79.75],
      [17.80, 79.75]
    ] as [number, number][],
    color: '#3b82f6'
  },
  {
    name: 'Karimnagar District Basin',
    coords: [
      [18.20, 78.95],
      [18.60, 78.95],
      [18.60, 79.35],
      [18.20, 79.35]
    ] as [number, number][],
    color: '#eab308'
  },
  {
    name: 'Nizamabad Sector',
    coords: [
      [18.50, 77.90],
      [18.85, 77.90],
      [18.85, 78.30],
      [18.50, 78.30]
    ] as [number, number][],
    color: '#f97316'
  },
  {
    name: 'Khammam Border Zone',
    coords: [
      [17.00, 79.95],
      [17.40, 79.95],
      [17.40, 80.40],
      [17.00, 80.40]
    ] as [number, number][],
    color: '#8b5cf6'
  },
  {
    name: 'Adilabad Frontier District',
    coords: [
      [19.45, 78.20],
      [19.85, 78.20],
      [19.85, 78.80],
      [19.45, 78.80]
    ] as [number, number][],
    color: '#ec4899'
  }
];

// Musi River coordinate vectors
const MUSI_RIVER_COORDS: [number, number][] = [
  [17.3800, 78.2500],
  [17.3750, 78.3500],
  [17.3685, 78.4967], // Chaderghat
  [17.3550, 78.5800],
  [17.3400, 78.7000],
  [17.3000, 78.9500],
  [17.2000, 79.2500]
];

// Safe evacuation and congestion paths (Color-Coded)
const ROUTE_LAYERS = [
  {
    name: 'NH-65 Evacuation Corridor (Gachibowli to Suryapet)',
    coords: [
      [17.4452, 78.3440],
      [17.3850, 78.4867],
      [17.2800, 78.8200],
      [17.1500, 79.2600],
      [17.1420, 79.6120]
    ] as [number, number][],
    color: '#10b981',
    risk: 'Safe'
  },
  {
    name: 'Hyderabad Musi Riverbank Corridor',
    coords: [
      [17.3820, 78.3120],
      [17.3685, 78.4967],
      [17.3550, 78.5800]
    ] as [number, number][],
    color: '#ef4444',
    risk: 'Dangerous'
  },
  {
    name: 'Secunderabad - Kukatpally Transit Loop',
    coords: [
      [17.4344, 78.5012],
      [17.4800, 78.4500],
      [17.5186, 78.4554]
    ] as [number, number][],
    color: '#f97316',
    risk: 'Moderate Risk'
  },
  {
    name: 'Emergency Medical Corridor (NIMS to Gandhi)',
    coords: [
      [17.4222, 78.4530],
      [17.4244, 78.5034]
    ] as [number, number][],
    color: '#3b82f6',
    risk: 'Emergency Priority'
  }
];

export default function CommandMap({
  incidents,
  vehicles,
  shelters,
  hospitals,
  warehouses,
  hazards,
  roadClosures,
  onToggleRoadClosure,
  selectedIncident,
  onSelectIncident,
  selectedVehicle,
  onSelectVehicle,
  forecastHours: propForecastHours,
  onForecastHoursChange,
  userLocation,
}: CommandMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapKey, setMapKey] = useState('');
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  
  const [localForecastHours, setLocalForecastHours] = useState<number>(0);
  const forecastHours = propForecastHours !== undefined ? propForecastHours : localForecastHours;
  const setForecastHours = onForecastHoursChange || setLocalForecastHours;

  // Viewport tracking state
  const [visibleBounds, setVisibleBounds] = useState<L.LatLngBounds | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(8);

  const userLocationIcon = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping"></div>
          <div class="absolute w-4 h-4 rounded-full bg-cyan-500 border-2 border-white shadow-[0_0_10px_#06b6d4]"></div>
        </div>
      `,
      className: 'custom-user-location-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }, []);

  // Layer toggles
  const [layers, setLayers] = useState({
    districts: true,
    rivers: true,
    shelters: true,
    hospitals: true,
    ndrfBases: true,
    closures: true,
    trafficRoutes: true,
    rainfall: false,
    windradar: false,
    lightning: false,
    policeStations: true,
    fireStations: true
  });


  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      setMapKey(`map-${Math.random().toString(36).substring(2, 9)}`);
    }, 0);
    return () => {
      clearTimeout(t);
      setMounted(false);
    };
  }, []);

  // Icon Generators
  const createIncidentIcon = useCallback((type: string, severity: number) => {
    let color = 'bg-red-500 shadow-[0_0_15px_#ef4444]';
    if (severity <= 50) {
      color = 'bg-yellow-500 shadow-[0_0_15px_#eab308]';
    } else if (severity <= 80) {
      color = 'bg-orange-500 shadow-[0_0_15px_#f97316]';
    }

    let symbol = '⚠️';
    if (type === 'Fire') symbol = '🔥';
    else if (type === 'Flood') symbol = '🌊';
    else if (type === 'Building Collapse') symbol = '🏢';
    else if (type === 'Landslide') symbol = '⛰️';
    else if (type === 'Road Blockage') symbol = '🚧';
    else if (type === 'Rainfall') symbol = '🌧️';
    else if (type === 'Chemical Leak') symbol = '🧪';
    else if (type === 'Fallen Trees') symbol = '🌳';
    else if (type === 'Power Failure') symbol = '⚡';
    else if (type === 'Cyclone') symbol = '🌪️';
    else if (type === 'Medical Emergency') symbol = '🚑';
    else if (type === 'Rescue Request') symbol = '🚨';
    else if (type === 'Missing Person') symbol = '👥';
    else if (type === 'Evacuation Zone') symbol = '🏠';
    else if (type === 'Snake Sighting') symbol = '🐍';
    else if (type === 'Wild Animal Rescue') symbol = '🦊';
    else if (type === 'Injured Stray Animal') symbol = '🐾';
    else if (type === 'Veterinary Emergency') symbol = '🩺';
    else if (type === 'Animal Disease Outbreak') symbol = '☣️';
    else if (type === 'Dead Animal Removal') symbol = '🚮';
    else if (type === 'Illegal Wildlife Sighting') symbol = '🏹';
    else if (type === 'Bee/Wasp Swarm') symbol = '🐝';
    else if (type === 'Monkey Nuisance') symbol = '🐒';
    else if (type === 'Cattle on Road') symbol = '🐄';
    else if (type === 'Dog Bite' || type === 'Dangerous Animal Attack') symbol = '🐕';
    else if (type === 'Water Contamination') symbol = '☣️';
    else if (type === 'Sewage Overflow') symbol = '💩';
    else if (type === 'Fallen Electric Pole') symbol = '⚡';
    else if (type === 'Broken Traffic Signal') symbol = '🚦';
    else if (type === 'Large Pothole' || type === 'Open Manhole') symbol = '🕳️';
    else if (type === 'Building Safety Hazard') symbol = '🏚️';

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}"></span>
          <div class="relative flex rounded-full h-6 w-6 ${color} border border-white/20 items-center justify-center text-[10px] font-bold text-white">
            ${symbol}
          </div>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  const createVehicleIcon = useCallback((type: string, status: string, id?: string) => {
    let emoji = '🚓';
    let animClass = '';
    let lightBar = '';

    if (id === 'veh-agent-1') {
      emoji = '👤';
      animClass = 'border-blue-500 shadow-blue-500/50 animate-pulse';
    } else if (type === 'Ambulance') {
      emoji = '🚑';
      animClass = 'beacon-red-blue';
      lightBar = '<span class="absolute -top-1 left-2 right-2 h-1 bg-red-500 rounded-sm"></span>';
    } else if (type === 'Mobile Medical') {
      emoji = '🚐';
      animClass = 'beacon-red-blue';
      lightBar = '<span class="absolute -top-1 left-2 right-2 h-1 bg-red-500 rounded-sm"></span>';
    } else if (type === 'Police' || type === 'Highway Patrol' || type === 'Traffic Police') {
      emoji = '🚓';
      animClass = 'beacon-red-blue';
      lightBar = '<span class="absolute -top-1 left-2 right-2 h-1 bg-blue-500 rounded-sm"></span>';
    } else if (type === 'Fire Truck') {
      emoji = '🚒';
      animClass = 'beacon-orange';
      lightBar = '<span class="absolute -top-1 left-2.5 h-1 w-1.5 bg-orange-500 rounded-full"></span>';
    } else if (type === 'NDRF' || type === 'SDRF') {
      emoji = '🚚';
      animClass = 'beacon-orange';
    } else if (type === 'Disaster Response') {
      emoji = '🚙';
      animClass = 'beacon-orange';
    } else if (type === 'Road Clearance') {
      emoji = '🚜';
      animClass = 'beacon-orange';
    } else if (type === 'Utility Repair') {
      emoji = '⚡';
      animClass = 'beacon-orange';
    } else if (type === 'Supply Truck') {
      emoji = '🚛';
      animClass = 'beacon-orange';
    } else if (type === 'Boat') {
      emoji = '🚤';
      animClass = 'boat-sway border-cyan-500/50 shadow-cyan-500/20';
    } else if (type === 'Helicopter') {
      emoji = '🚁';
      animClass = 'border-purple-500/50 shadow-purple-500/20';
      lightBar = '<div class="absolute -top-2 w-7 h-[1.5px] bg-zinc-400 rotor-blade"></div>';
    } else if (type === 'Drone') {
      emoji = '🚁';
      animClass = 'drone-float border-emerald-500/50 shadow-emerald-500/20';
      lightBar = '<div class="absolute -top-1.5 -left-1.5 w-2 h-[1px] bg-zinc-400 rotor-blade"></div>' +
                 '<div class="absolute -top-1.5 -right-1.5 w-2 h-[1px] bg-zinc-400 rotor-blade"></div>';
    }

    let borderClass = 'border-white/20';
    if (status === 'Active') borderClass = 'border-emerald-400';
    else if (status === 'EnRoute') borderClass = 'border-orange-400';

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full border bg-zinc-950/90 text-sm shadow-lg ${borderClass} ${animClass}">
          ${lightBar}
          <span style="font-size: 13px;">${emoji}</span>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  const createInfrastructureIcon = useCallback((type: 'Hospital' | 'Shelter' | 'Warehouse' | 'NDRFBase' | 'BloodBank' | 'Command') => {
    let bgColor = 'bg-blue-600 border-blue-400 shadow-lg';
    let label = '🏢';

    if (type === 'Hospital') {
      bgColor = 'bg-red-950 border-red-500/50 shadow-red-500/10';
      label = '🏥';
    } else if (type === 'Shelter') {
      bgColor = 'bg-emerald-950 border-emerald-500/50 shadow-emerald-500/10';
      label = '🏕️';
    } else if (type === 'Warehouse') {
      bgColor = 'bg-amber-950 border-amber-500/50 shadow-amber-500/10';
      label = '📦';
    } else if (type === 'NDRFBase') {
      bgColor = 'bg-cyan-950 border-cyan-500/50 shadow-cyan-500/15 animate-pulse';
      label = '⚓';
    } else if (type === 'BloodBank') {
      bgColor = 'bg-rose-950 border-rose-500/50 shadow-rose-500/10';
      label = '🩸';
    } else if (type === 'Command') {
      bgColor = 'bg-zinc-900 border-orange-500/40 shadow-orange-500/10';
      label = '🚨';
    }

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-7 h-7 rounded-md border ${bgColor} text-white font-bold text-xs">
          ${label}
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }, []);

  const createClosureIcon = useCallback(() => {
    return L.divIcon({
      html: `
        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 border border-yellow-300 shadow-[0_0_8px_#d97706] text-black font-extrabold text-[10px] animate-pulse">
          🚧
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, []);

  // Memoized custom Leaflet icons to satisfy strict render checks (no refs read in render)
  const incidentIcons = useMemo(() => {
    const cache: Record<string, L.DivIcon> = {};
    incidents.forEach((inc) => {
      const key = `${inc.type}-${inc.severity}`;
      if (!cache[key]) {
        cache[key] = createIncidentIcon(inc.type, inc.severity);
      }
    });
    return cache;
  }, [incidents, createIncidentIcon]);

  const vehicleIcons = useMemo(() => {
    const cache: Record<string, L.DivIcon> = {};
    vehicles.forEach((v) => {
      const key = v.id === 'veh-agent-1' ? v.id : `${v.type}-${v.status}`;
      if (!cache[key]) {
        cache[key] = createVehicleIcon(v.type, v.status, v.id);
      }
    });
    return cache;
  }, [vehicles, createVehicleIcon]);

  const infraIcons = useMemo(() => {
    return {
      Hospital: createInfrastructureIcon('Hospital'),
      Shelter: createInfrastructureIcon('Shelter'),
      Warehouse: createInfrastructureIcon('Warehouse'),
      NDRFBase: createInfrastructureIcon('NDRFBase'),
      BloodBank: createInfrastructureIcon('BloodBank'),
      Command: createInfrastructureIcon('Command'),
    };
  }, [createInfrastructureIcon]);

  const closureIcon = useMemo(() => createClosureIcon(), [createClosureIcon]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Viewport Culling logic
  const isVisible = useCallback((loc: Location) => {
    if (!visibleBounds) return true; // fallback to showing
    return visibleBounds.contains([loc.lat, loc.lng]);
  }, [visibleBounds]);

  // Level of detail zoom rules: Hide bases if zoomed out below 8
  const showBases = currentZoom >= 8;

  // Calculate active hazards and closures based on forecastHours
  const activeHazards = useMemo(() => {
    return simulateThreatGrowth(forecastHours, hazards);
  }, [hazards, forecastHours]);

  const activeRoadClosures = useMemo(() => {
    const list = [...roadClosures];
    if (forecastHours >= 6) list.push({ lat: 17.3685, lng: 78.4967 }); // Musi River Crossing
    if (forecastHours >= 12) list.push({ lat: 17.4530, lng: 78.4680 }); // Begumpet Airfield area
    if (forecastHours >= 24) list.push({ lat: 17.5186, lng: 78.4554 }); // Jeedimetla Industrial Area
    if (forecastHours >= 36) list.push({ lat: 17.3300, lng: 77.9000 }); // Vikarabad Ghat road
    return list;
  }, [roadClosures, forecastHours]);

  // Filter lists based on culling to reduce Leaflet DOM nodes
  const visibleIncidents = incidents.filter(inc => inc.status !== 'Resolved' && isVisible(inc.location));
  const visibleVehicles = vehicles.filter(v => isVisible(v.location) || v.status === 'EnRoute');
  const visibleHospitals = hospitals.filter(h => isVisible(h.location));
  const visibleShelters = shelters.filter(s => isVisible(s.location));
  const visibleWarehouses = warehouses.filter(w => isVisible(w.location));
  const visibleClosures = activeRoadClosures.filter(c => isVisible(c));

  if (!mounted || !mapKey) {
    return (
      <div className="w-full h-full bg-zinc-950/80 border border-white/5 rounded-2xl flex items-center justify-center text-cyan-400 font-mono text-[9px] uppercase tracking-widest animate-pulse">
        <span>⚡ Initializing Safe-Route GIS Engines...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
      <style jsx global>{`
        .leaflet-marker-icon {
          transition: transform 1.5s linear, left 1.5s linear, top 1.5s linear !important;
        }
        .radar-scan-pulse {
          animation: radar-sweep 6s linear infinite;
        }
        @keyframes radar-sweep {
          0% { transform: scale(0.9) rotate(0deg); opacity: 0.25; }
          50% { transform: scale(1.1) rotate(180deg); opacity: 0.55; }
          100% { transform: scale(0.9) rotate(360deg); opacity: 0.25; }
        }
        .rain-radar-effect {
          animation: rain-pulse 2.5s ease-in-out infinite;
        }
        @keyframes rain-pulse {
          0%, 100% { fill-opacity: 0.08; stroke-opacity: 0.3; }
          50% { fill-opacity: 0.16; stroke-opacity: 0.6; }
        }
        @keyframes strobe-red-blue {
          0%, 49% { box-shadow: 0 0 14px #ef4444, inset 0 0 5px #ef4444; border-color: #f87171; }
          50%, 100% { box-shadow: 0 0 14px #3b82f6, inset 0 0 5px #3b82f6; border-color: #60a5fa; }
        }
        @keyframes strobe-orange {
          0%, 100% { box-shadow: 0 0 10px #f97316; border-color: #fb923c; }
          50% { box-shadow: 0 0 2px #c2410c; border-color: #ea580c; }
        }
        @keyframes rotor-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float-sway {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-2px) rotate(1deg); }
        }
        @keyframes drone-hover {
          0%, 100% { transform: translateY(0) scale(0.95); opacity: 0.9; }
          50% { transform: translateY(-3px) scale(1.05); opacity: 1; }
        }
        .beacon-red-blue {
          animation: strobe-red-blue 0.4s steps(2) infinite;
        }
        .beacon-orange {
          animation: strobe-orange 0.3s ease-in-out infinite;
        }
        .rotor-blade {
          animation: rotor-spin 0.08s linear infinite;
          transform-origin: center;
        }
        .boat-sway {
          animation: float-sway 2.5s ease-in-out infinite;
        }
        .drone-float {
          animation: drone-hover 1.8s ease-in-out infinite;
        }
      `}</style>

      <MapContainer
        key={mapKey}
        center={[17.8000, 79.1000]}
        zoom={8}
        className="w-full h-full bg-zinc-950"
        zoomControl={true}
        preferCanvas={true} // Bypasses heavy SVG renders, drawing lines directly on hardware Canvas
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          className="dark-leaflet-tiles"
        />

        {/* Step 2 & 3: Dynamic center fly-to updates */}
        <MapCenterHandler
          selectedIncident={selectedIncident}
          selectedVehicle={selectedVehicle}
          userLocation={userLocation}
        />

        {/* Viewport Bounds listener */}
        <ViewportTracker
          onBoundsChange={setVisibleBounds}
          onZoomChange={setCurrentZoom}
        />

        {/* Clicks add road barriers */}
        {layers.closures && (
          <MapEventsHandler onMapClick={onToggleRoadClosure} />
        )}

        {/* User's live tracked location marker */}
        {userLocation && userLocationIcon && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userLocationIcon}
            zIndexOffset={1000}
          >
            <Tooltip permanent={false} direction="top" offset={[0, -10]}>
              <span className="font-mono text-[9px] uppercase font-bold text-cyan-400">YOUR LIVE GPS SIGNAL</span>
            </Tooltip>
          </Marker>
        )}

        {/* District bounds (canvas polygons) */}
        {layers.districts &&
          DISTRICT_BOUNDS.map((dist, idx) => (
            <Polygon
              key={idx}
              positions={dist.coords}
              pathOptions={{
                color: dist.color,
                weight: 1,
                fillColor: dist.color,
                fillOpacity: 0.01,
                dashArray: '3, 6'
              }}
            >
              <Popup>
                <div className="text-[9px] font-mono font-bold text-white uppercase">
                  District Sector: {dist.name}
                </div>
              </Popup>
            </Polygon>
          ))}

        {/* Rivers (canvas vectors) */}
        {layers.rivers && (
          <>
            <Polyline
              positions={MUSI_RIVER_COORDS}
              pathOptions={{ color: '#2563eb', weight: 2.5, opacity: 0.7 }}
            />
            {/* Osman Sagar */}
            <Circle
              center={[17.3820, 78.3120]}
              radius={2000}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
            {/* Himayat Sagar */}
            <Circle
              center={[17.3195, 78.3582]}
              radius={2500}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
            {/* Singur Dam */}
            <Circle
              center={[17.7512, 77.9312]}
              radius={3500}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.3 }}
            />
          </>
        )}

        {/* Route Paths (canvas overlays) */}
        {layers.trafficRoutes &&
          ROUTE_LAYERS.map((route, i) => (
            <Polyline
              key={`route-layer-${i}`}
              positions={route.coords}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.65,
                dashArray: route.risk === 'Safe' ? '6, 12' : undefined
              }}
            >
              <Popup>
                <div className="text-[10px] font-mono">
                  <p className="font-bold text-white uppercase">{route.name}</p>
                  <p className="text-zinc-400">Risk rating: <span className="font-bold text-white">{route.risk}</span></p>
                </div>
              </Popup>
            </Polyline>
          ))}

        {/* Weather Radars */}
        {layers.rainfall && (
          <Circle
            center={[18.1000, 78.8500]}
            radius={45000}
            pathOptions={{
              color: '#06b6d4',
              fillColor: '#06b6d4',
              fillOpacity: 0.12,
              weight: 1,
              dashArray: '3, 6'
            }}
            className="rain-radar-effect"
          />
        )}

        {/* Wind Speed vectors */}
        {layers.windradar && (
          <Circle
            center={[17.5000, 79.8000]}
            radius={60000}
            pathOptions={{
              color: '#a855f7',
              fillColor: '#a855f7',
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: '8, 8'
            }}
            className="radar-scan-pulse"
          />
        )}

        {/* Storm lightning strikes */}
        {layers.lightning && (
          <>
            <Marker position={[18.0500, 78.9000]} icon={L.divIcon({ html: '<span class="text-xl animate-bounce">⚡</span>', className: 'custom-div-icon' })} />
            <Marker position={[18.2500, 78.7500]} icon={L.divIcon({ html: '<span class="text-xl animate-bounce">⚡</span>', className: 'custom-div-icon' })} />
          </>
        )}

        {/* Base Stations (Visible if zoomed in) */}
        {showBases && layers.ndrfBases && (
          <>
            {/* NDRF Hyderabad HQ */}
            <Marker position={[17.4850, 78.5410]} icon={infraIcons.NDRFBase}>
              <Popup><span className="text-[10px] font-mono text-cyan-400 font-bold">⚓ NDRF REGIONAL BASE BATTALION</span></Popup>
            </Marker>
            {/* SDRF Command Center */}
            <Marker position={[17.3800, 78.4300]} icon={infraIcons.NDRFBase}>
              <Popup><span className="text-[10px] font-mono text-cyan-400 font-bold">⚓ SDRF COMMAND OFFICE HQ</span></Popup>
            </Marker>
            {/* Telangana Emergency Command Center */}
            <Marker position={[17.3600, 78.4600]} icon={infraIcons.Command}>
              <Popup><span className="text-[10px] font-mono text-orange-400 font-bold">🚨 TSDMA CENTRAL COMMAND EOC</span></Popup>
            </Marker>
            {/* Red Cross Blood Bank */}
            <Marker position={[17.4000, 78.4700]} icon={infraIcons.BloodBank}>
              <Popup><span className="text-[10px] font-mono text-rose-400 font-bold">🩸 RED CROSS CENTRAL BLOOD BANK</span></Popup>
            </Marker>

            {/* Police Stations */}
            {layers.policeStations &&
              defaultPoliceStations.map((station) => (
                <Marker
                  key={station.id}
                  position={[station.location.lat, station.location.lng]}
                  icon={infraIcons.Command}
                >
                  <Popup>
                    <div className="text-[10px] font-mono">
                      <span className="font-bold text-blue-400 uppercase">🚓 {station.name}</span>
                      <p className="text-zinc-300 mt-0.5">Government Police Station Node. Deploying active highway and street patrol units.</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Fire Stations */}
            {layers.fireStations &&
              defaultFireStations.map((station) => (
                <Marker
                  key={station.id}
                  position={[station.location.lat, station.location.lng]}
                  icon={infraIcons.Hospital}
                >
                  <Popup>
                    <div className="text-[10px] font-mono">
                      <span className="font-bold text-red-400 uppercase">🚒 {station.name}</span>
                      <p className="text-zinc-300 mt-0.5">TSDMA Fire & Hazmat Station. Foam engines and clearing equipment ready.</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </>
        )}

        {/* 1h / 3h / 6h Predictive expansion heatmaps */}
        {forecastHours > 0 && (
          <>
            {/* Musi River flood projection */}
            <Circle
              center={[17.3685, 78.4967]}
              radius={800 + forecastHours * 1000}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '3, 6'
              }}
            />
            {/* Jeedimetla Chemical leak projection */}
            <Circle
              center={[17.5186, 78.4554]}
              radius={600 + forecastHours * 800}
              pathOptions={{
                color: '#a855f7',
                fillColor: '#a855f7',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '3, 6'
              }}
            />
          </>
        )}

        {/* Step 4: Temporary Command Posts (EOC Tents) near major incidents */}
        {incidents
          .filter((inc) => inc.status !== 'Resolved' && inc.severity >= 75 && isVisible(inc.location))
          .map((inc) => (
            <Marker
              key={`eoc-tent-${inc.id}`}
              position={[inc.location.lat + 0.002, inc.location.lng - 0.002]}
              icon={infraIcons.Command}
            >
              <Popup>
                <div className="text-[9px] font-mono">
                  <span className="font-bold text-orange-400 uppercase">⛺ FORWARD COMMAND POST</span>
                  <p className="text-zinc-300 mt-0.5">Est. for local scene coordination of {inc.type} response operations.</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Step 4: Active Incident Special Effect Visuals */}
        {selectedIncident && (
          <>
            {/* Blinking central beacon ring */}
            <Circle
              center={[selectedIncident.location.lat, selectedIncident.location.lng]}
              radius={200}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: '3, 6'
              }}
              className="radar-scan-pulse"
            />
            
            {/* Specific Disaster Animations */}
            {selectedIncident.type === 'Building Collapse' && (
              <>
                {/* Debris outline */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={120}
                  pathOptions={{ color: '#d97706', fillColor: '#78350f', fillOpacity: 0.25, weight: 2 }}
                />
                {/* Dust cloud / Blinking Emergency Beacon */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={45}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6, weight: 1 }}
                  className="rain-radar-effect"
                />
              </>
            )}

            {selectedIncident.type === 'Medical Emergency' && (
              <Circle
                center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                radius={80}
                pathOptions={{ color: '#ef4444', fillColor: '#b91c1c', fillOpacity: 0.2, weight: 2 }}
                className="rain-radar-effect"
              />
            )}

            {selectedIncident.type === 'Fire' && (
              <>
                {/* Heat zone circle */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={350}
                  pathOptions={{ color: '#f97316', fillColor: '#ea580c', fillOpacity: 0.2, weight: 2 }}
                />
                {/* Smoke outer ring */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={180}
                  pathOptions={{ color: '#4b5563', fillColor: '#374151', fillOpacity: 0.3, weight: 1, dashArray: '5, 5' }}
                  className="radar-scan-pulse"
                />
              </>
            )}

            {selectedIncident.type === 'Flood' && (
              <>
                {/* Blue flood boundary */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={1000}
                  pathOptions={{ color: '#2563eb', fillColor: '#1d4ed8', fillOpacity: 0.25, weight: 3 }}
                  className="rain-radar-effect"
                />
              </>
            )}

            {selectedIncident.type === 'Power Failure' && (
              <>
                {/* Shaded darkened area */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={700}
                  pathOptions={{ color: '#1f2937', fillColor: '#030712', fillOpacity: 0.5, weight: 1.5, dashArray: '8, 8' }}
                />
              </>
            )}

            {selectedIncident.type === 'Road Blockage' && (
              <>
                {/* Road barrier markers boundary */}
                <Circle
                  center={[selectedIncident.location.lat, selectedIncident.location.lng]}
                  radius={120}
                  pathOptions={{ color: '#d97706', fillColor: '#d97706', fillOpacity: 0.15, weight: 2, dashArray: '4, 8' }}
                />
              </>
            )}
          </>
        )}
        {/* Dynamic General Hazards */}
        {activeHazards.map((h, i) => (
          <Circle
            key={`env-hazard-${h.id || i}`}
            center={[h.location.lat, h.location.lng]}
            radius={h.radiusKm * 1000}
            pathOptions={{
              color: h.type === 'Fire' ? '#ef4444' : h.type === 'Chemical Leak' ? '#a855f7' : '#3b82f6',
              fillColor: h.type === 'Fire' ? '#b91c1c' : h.type === 'Chemical Leak' ? '#7e22ce' : '#1d4ed8',
              fillOpacity: 0.15 + (forecastHours * 0.003),
              weight: 2,
              dashArray: '5, 5'
            }}
          >
            <Popup>
              <div className="text-[10px] font-mono">
                <span className="font-bold text-yellow-500 uppercase">🚨 PROJECTED HAZARD PLUME</span>
                <p>Type: {h.type}</p>
                <p>Projected Radius: {(h.radiusKm).toFixed(2)} km</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Evacuation Routes */}
        {forecastHours > 0 && incidents
          .filter((inc) => inc.status !== 'Resolved' && (inc.type === 'Flood' || inc.type === 'Fire' || inc.type === 'Building Collapse'))
          .map((inc) => {
            let nearestShelter = shelters[0];
            let minDist = Infinity;
            shelters.forEach((s) => {
              const dist = getDistance(inc.location, s.location);
              if (dist < minDist) {
                minDist = dist;
                nearestShelter = s;
              }
            });
            
            if (!nearestShelter) return null;
            const evacPath = generateOptimizedPath(inc.location, nearestShelter.location, activeHazards, activeRoadClosures, 'Supply Truck');
            
            return (
              <Polyline
                key={`evac-route-${inc.id}`}
                positions={evacPath.map((loc) => [loc.lat, loc.lng])}
                pathOptions={{
                  color: '#10b981',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '8, 8',
                }}
              >
                <Popup>
                  <div className="text-[10px] font-mono">
                    <span className="font-bold text-emerald-400 uppercase">🟢 ACTIVE EVACUATION ROUTE</span>
                    <p className="text-zinc-300 mt-0.5">Diverting evacuees to {nearestShelter.name}.</p>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* Road Closures */}
        {layers.closures &&
          visibleClosures.map((closure, i) => (
            <Marker
              key={`closure-${i}`}
              position={[closure.lat, closure.lng]}
              icon={closureIcon}
              eventHandlers={{
                click: () => onToggleRoadClosure(closure),
              }}
            >
              <Popup>
                <div className="text-[10px] font-mono text-zinc-300">
                  <p className="font-bold text-yellow-400 uppercase">🚧 Road Barrier Block</p>
                  <p>Click to clear and allow emergency route pathing.</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Dynamic Celled Incidents */}
        {visibleIncidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.location.lat, inc.location.lng]}
            icon={incidentIcons[`${inc.type}-${inc.severity}`] || closureIcon}
            eventHandlers={{
              click: () => onSelectIncident(inc),
            }}
          >
            <Popup>
              <div className="w-56 text-[10px] font-mono space-y-1 text-zinc-300">
                <div className="flex justify-between items-center border-b border-white/10 pb-1">
                  <span className="font-bold text-red-400 uppercase">{inc.type} Scene</span>
                  <span className="bg-white/10 px-1 rounded text-[8px]">PRIORITY: {inc.aiPriority}</span>
                </div>
                <p className="text-white text-[11px] font-semibold leading-tight">{inc.description}</p>
                <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded text-zinc-400">
                  <div>Severity: <span className="text-orange-400 font-bold">{inc.severity}%</span></div>
                  <div>Trapped: <span className="text-white font-bold">{inc.trappedCount}</span></div>
                  <div>ETA: <span className="text-cyan-400 font-bold">{inc.etaResolution}h</span></div>
                  <div>Assigned: <span className="text-white font-bold">{inc.assignedVehicleId || 'NONE'}</span></div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Infrastructure: Hospitals */}
        {showBases && layers.hospitals &&
          visibleHospitals.map((hosp) => (
            <Marker
              key={hosp.id}
              position={[hosp.location.lat, hosp.location.lng]}
              icon={infraIcons.Hospital}
            >
              <Popup>
                <div className="w-48 text-xs font-mono">
                  <p className="font-bold text-red-400">{hosp.name}</p>
                  <div className="mt-1 space-y-0.5 text-zinc-300 text-[10px]">
                    <p>Occupied: {hosp.occupiedBeds} / {hosp.totalBeds} beds</p>
                    <p>ICU Vacant quotient: {hosp.icuAvailable}%</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Infrastructure: Shelters */}
        {showBases && layers.shelters &&
          visibleShelters.map((shl) => (
            <Marker
              key={shl.id}
              position={[shl.location.lat, shl.location.lng]}
              icon={infraIcons.Shelter}
            >
              <Popup>
                <div className="w-48 text-xs font-mono">
                  <p className="font-bold text-emerald-400">{shl.name}</p>
                  <div className="mt-1 space-y-0.5 text-zinc-300 text-[10px]">
                    <p>Capacity: {shl.occupied} / {shl.capacity} persons</p>
                    <p>Rations: {shl.foodSupply}% | Water: {shl.waterSupply}%</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Infrastructure: Warehouses */}
        {showBases &&
          visibleWarehouses.map((wh) => (
            <Marker
              key={wh.id}
              position={[wh.location.lat, wh.location.lng]}
              icon={infraIcons.Warehouse}
            >
              <Popup>
                <div className="w-48 text-xs font-mono">
                  <p className="font-bold text-amber-400">{wh.name}</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[9px] text-zinc-300">
                    <div>Rations: {wh.supplies.food}</div>
                    <div>Water: {wh.supplies.water}L</div>
                    <div>Medicine: {wh.supplies.medicine}</div>
                    <div>Fuel: {wh.supplies.fuel}L</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Live User Agent Commander Location tracking */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              html: `
                <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 border border-white shadow-[0_0_12px_#3b82f6] animate-pulse">
                  <span style="font-size: 13px;">👤</span>
                </div>
              `,
              className: 'custom-div-icon',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup>
              <div className="text-[10px] font-mono">
                <span className="font-bold text-blue-400 uppercase">👤 FIELD COMMANDER (HQ)</span>
                <p className="text-zinc-300 mt-0.5">Your live GPS tracking coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Visible Responders */}
        {visibleVehicles.map((v) => (
          <Marker
            key={v.id}
            position={[v.location.lat, v.location.lng]}
            icon={vehicleIcons[v.id === 'veh-agent-1' ? v.id : `${v.type}-${v.status}`] || closureIcon}
            eventHandlers={{
              click: () => {
                onSelectVehicle(v);
              },
            }}
          >
            {/* Step 5: Render permanent ETA tags above active vehicles */}
            {v.status === 'EnRoute' && (
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent>
                <span className="bg-zinc-950/85 border border-cyan-500/30 px-1 py-0.5 rounded text-[8px] font-mono font-bold text-cyan-300">
                  {v.name} ETA: {v.etaMinutes}m
                </span>
              </Tooltip>
            )}
            <Popup>
              <div className="text-[10px] font-mono space-y-1">
                <p className="font-bold text-cyan-400">{v.name}</p>
                <p className="text-zinc-300">Status: <span className="font-semibold text-white uppercase">{v.status}</span></p>
                <p className="text-zinc-500 text-[8px]">Click marker to open Telemetry dashboard panel.</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Step 6: Animated detours drawn on canvas polyline with color-coded tags */}
        {vehicles
          .filter((v) => v.status === 'EnRoute' && v.path.length > 0)
          .map((v) => {
            let pathColor = '#06b6d4'; // default cyan
            if (v.type === 'Police' || v.type === 'Traffic Police' || v.type === 'Highway Patrol') {
              pathColor = '#2563eb'; // Blue (Police)
            } else if (v.type === 'Fire Truck') {
              pathColor = '#ef4444'; // Red (Fire)
            } else if (v.type === 'Ambulance' || v.type === 'Mobile Medical') {
              pathColor = '#10b981'; // Green (Ambulance)
            } else if (v.type === 'NDRF' || v.type === 'SDRF') {
              pathColor = '#f97316'; // Orange (Rescue Team)
            }

            return (
              <Polyline
                key={`route-track-${v.id}`}
                positions={(() => {
                  if (forecastHours === 0) {
                    return v.path.map((loc) => [loc.lat, loc.lng]);
                  }
                  // Calculate dynamic detours! Find target incident
                  const destIncident = incidents.find((inc) => inc.id === v.activeIncidentId);
                  const destLoc = destIncident ? destIncident.location : (v.path[v.path.length - 1] || v.location);
                  const detour = generateOptimizedPath(v.location, destLoc, activeHazards, activeRoadClosures, v.type);
                  return detour.map((loc) => [loc.lat, loc.lng]);
                })()}
                pathOptions={{
                  color: pathColor,
                  weight: 3.5,
                  opacity: 0.85,
                  dashArray: '5, 8',
                  lineJoin: 'round',
                }}
              />
            );
          })}
      </MapContainer>



      {/* Floating Layer Control Drawer */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={() => setLayersPanelOpen(!layersPanelOpen)}
          className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded-xl border border-white/10 shadow-lg transition flex items-center justify-center"
        >
          <Layers className="w-4 h-4" />
        </button>

        {layersPanelOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl font-mono text-[9px] space-y-1.5 max-h-96 overflow-y-auto">
            <span className="font-bold text-zinc-400 uppercase tracking-widest block border-b border-white/5 pb-1 mb-2">T-AIDRCC Map Layers</span>
            
            <button
              onClick={() => toggleLayer('districts')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>District Boundaries</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.districts && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('rivers')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>Musi River & Reservoirs</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.rivers && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('ndrfBases')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>NDRF / SDRF Bases</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.ndrfBases && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('policeStations')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>Police Stations</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.policeStations && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('fireStations')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>Fire Stations</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.fireStations && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('trafficRoutes')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>Color-Coded Traffic</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.trafficRoutes && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('closures')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span>Road Closures Toggles</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.closures && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <span className="font-bold text-zinc-500 uppercase tracking-widest block border-t border-white/5 pt-2 mt-2 pb-1">Weather Radars</span>

            <button
              onClick={() => toggleLayer('rainfall')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span className="flex items-center gap-1.5"><Droplets className="w-3 h-3 text-cyan-400" /> Rain radar scan</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.rainfall && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>

            <button
              onClick={() => toggleLayer('windradar')}
              className="flex items-center justify-between w-full text-left py-1 text-zinc-300 hover:text-white"
            >
              <span className="flex items-center gap-1.5"><Wind className="w-3 h-3 text-purple-400" /> Wind vectors</span>
              <div className="w-3.5 h-3.5 border border-white/20 rounded flex items-center justify-center bg-black/40">
                {layers.windradar && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Sleek Vehicle Telemetry Glassmorphic Dashboard Panel Overlay */}
      {selectedVehicle && (
        <div className="absolute bottom-3 left-3 z-[1000] w-80 bg-zinc-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl font-mono text-[10px] space-y-3 flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-white/10 pb-2">
            <div>
              <h3 className="font-bold text-white text-xs">{selectedVehicle.name}</h3>
              <p className="text-zinc-500 text-[8px]">ID: {selectedVehicle.id} | Class: {selectedVehicle.type}</p>
            </div>
            <button
              onClick={() => onSelectVehicle(null)}
              className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-zinc-400">
            <div className="space-y-1">
              <div>GPS Position: <span className="text-white block text-[9px]">{selectedVehicle.location.lat.toFixed(4)}, {selectedVehicle.location.lng.toFixed(4)}</span></div>
              <div>Velocity: <span className="text-cyan-400 font-bold block">{selectedVehicle.speed} km/h</span></div>
            </div>
            <div className="space-y-1">
              <div>Fuel Registry: <span className={`font-bold block ${selectedVehicle.fuel < 20 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{selectedVehicle.fuel}%</span></div>
              <div>Crew Quotient: <span className="text-white block font-bold">{selectedVehicle.crewSize} Members</span></div>
            </div>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-2">
            <span className="font-bold text-zinc-400 block text-[8px] uppercase tracking-wider">Crew Manifest:</span>
            <p className="text-zinc-300 text-[9px] leading-tight">{selectedVehicle.crewNames.join(', ')}</p>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-2">
            <span className="font-bold text-zinc-400 block text-[8px] uppercase tracking-wider">Equipment list:</span>
            <p className="text-zinc-300 text-[9px] leading-tight">{selectedVehicle.equipment.join(', ')}</p>
          </div>

          {selectedVehicle.activeIncidentId && (
            <div className="bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-lg space-y-1">
              <div className="flex justify-between items-center text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
                <span>Active Mission Details</span>
                <span>ETA: {selectedVehicle.etaMinutes} mins</span>
              </div>
              <p className="text-zinc-300 text-[9px] leading-normal">{selectedVehicle.missionDescription}</p>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-[8px] text-zinc-500">
            <span className={`w-1.5 h-1.5 rounded-full ${selectedVehicle.status === 'Active' ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></span>
            <span className="uppercase">LOGISTICS STATUS: {selectedVehicle.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
