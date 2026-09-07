import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Location,
  Incident,
  Vehicle,
  Shelter,
  Hospital,
  Warehouse,
  defaultIncidents,
  defaultShelters,
  defaultHospitals,
  defaultWarehouses,
  generateInitialFleet
} from '../utils/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  generateOptimizedPath,
  recommendVehiclesForIncident,
  predictHospitalLoad,
  predictShelterLoad,
  simulateThreatGrowth,
  getDistance
} from '../utils/routing';

function getDistanceKm(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth radius in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function advanceVehicleAlongPath(
  path: Location[],
  currentIndex: number,
  distanceToTravel: number
): { nextLocation: Location; nextIndex: number } {
  if (path.length === 0) {
    return { nextLocation: { lat: 0, lng: 0 }, nextIndex: 0 };
  }
  if (currentIndex >= path.length - 1) {
    return { nextLocation: path[path.length - 1], nextIndex: path.length - 1 };
  }

  let remainingDist = distanceToTravel;
  let idx = currentIndex;
  let currentLoc = path[idx];

  while (remainingDist > 0 && idx < path.length - 1) {
    const nextLoc = path[idx + 1];
    const segmentDist = getDistanceKm(currentLoc, nextLoc);

    if (remainingDist >= segmentDist) {
      remainingDist -= segmentDist;
      idx++;
      currentLoc = nextLoc;
    } else {
      const ratio = segmentDist > 0 ? (remainingDist / segmentDist) : 0;
      const lat = currentLoc.lat + (nextLoc.lat - currentLoc.lat) * ratio;
      const lng = currentLoc.lng + (nextLoc.lng - currentLoc.lng) * ratio;
      return {
        nextLocation: { lat, lng },
        nextIndex: idx
      };
    }
  }

  return {
    nextLocation: path[path.length - 1],
    nextIndex: path.length - 1
  };
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  message: string;
  type: 'emergency' | 'warning' | 'info' | 'success';
  read: boolean;
}

export const INCIDENTS_STORAGE_KEY = 'resqai_disaster_registry_v1';

export function loadStoredIncidents(): Incident[] {
  if (typeof window === 'undefined') return defaultIncidents;
  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return defaultIncidents;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultIncidents;
    const userIds = new Set(parsed.map((i: Incident) => i.id));
    const missingDefaults = defaultIncidents.filter((d) => !userIds.has(d.id));
    return [...parsed, ...missingDefaults] as Incident[];
  } catch (e) {
    console.error('Failed to load stored incidents:', e);
    return defaultIncidents;
  }
}

export function persistIncidents(incidents: Incident[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
  } catch (e) {
    console.error('Failed to persist incidents to storage:', e);
  }
}

export function useSimulation() {
  const [incidents, setIncidents] = useState<Incident[]>(defaultIncidents);

  // Load persisted incidents on mount (client-side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = loadStoredIncidents();
      if (stored && stored.length > 0) {
        setIncidents(stored);
      }
    }
  }, []);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => generateInitialFleet());
  const [shelters, setShelters] = useState<Shelter[]>(defaultShelters);
  const [hospitals, setHospitals] = useState<Hospital[]>(defaultHospitals);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(defaultWarehouses);

  // Active hazard zones on map
  const [hazards, setHazards] = useState([
    { id: 'haz-1', type: 'Fire', location: { lat: 17.5186, lng: 78.4554 }, radiusKm: 0.6 }, // Jeedimetla
    { id: 'haz-2', type: 'Flood', location: { lat: 17.3685, lng: 78.4967 }, radiusKm: 0.8 }, // Musi River
    { id: 'haz-3', type: 'Landslide', location: { lat: 17.3300, lng: 77.9000 }, radiusKm: 0.4 }, // Vikarabad
  ]);

  const [roadClosures, setRoadClosures] = useState<Location[]>([
    { lat: 17.1420, lng: 79.6120 }, // NH-65 Suryapet blockage
    { lat: 17.4480, lng: 78.4720 }  // Begumpet Road flyover block
  ]);

  const stateRef = useRef({ vehicles, incidents, hazards, roadClosures });
  useEffect(() => {
    stateRef.current = { vehicles, incidents, hazards, roadClosures };
  }, [vehicles, incidents, hazards, roadClosures]);

  const [notifications, setNotifications] = useState<AlertNotification[]>([
    {
      id: 'notif-1',
      timestamp: '10:04:12',
      message: 'CRITICAL: River sensors trigger flood alarm. Musi River levels breaching alert bounds near Chaderghat, Hyderabad.',
      type: 'emergency',
      read: false
    },
    {
      id: 'notif-2',
      timestamp: '10:12:45',
      message: 'WARNING: Chemical plant thermal fire alert registered at Jeedimetla industrial zone.',
      type: 'warning',
      read: false
    },
    {
      id: 'notif-3',
      timestamp: '10:22:00',
      message: 'INFO: Citizen SOS landslide report received. Vikarabad ghat road obstructed by debris.',
      type: 'info',
      read: false
    }
  ]);

  // Simulation controls
  const [simulationHour, setSimulationHour] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(false);

  // Add notification helper
  const addNotification = useCallback((message: string, type: 'emergency' | 'warning' | 'info' | 'success') => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: timeStr,
        message,
        type,
        read: false,
      },
      ...prev,
    ]);
  }, []);

  // Fetch initial data from Supabase if active
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const loadSupabaseData = async () => {
      try {
        // 1. Fetch Incidents
        const { data: dbIncidents, error: incError } = await client
          .from('incidents')
          .select('*')
          .order('reportedAt', { ascending: false });

        if (incError) throw incError;

        if (dbIncidents && dbIncidents.length > 0) {
          // Merge database incidents with our premium defaultIncidents (ensuring unique IDs)
          const dbIds = new Set(dbIncidents.map((i) => i.id));
          const uniqueDefaults = defaultIncidents.filter((i) => !dbIds.has(i.id));
          setIncidents([...dbIncidents, ...uniqueDefaults] as Incident[]);
        } else {
          await client.from('incidents').insert(defaultIncidents);
          setIncidents(defaultIncidents);
        }

        // 2. Fetch Shelters
        const { data: dbShelters, error: shltError } = await client
          .from('shelters')
          .select('*');

        if (shltError) throw shltError;

        if (dbShelters && dbShelters.length > 0) {
          setShelters(dbShelters as Shelter[]);
        } else {
          await client.from('shelters').insert(defaultShelters);
          setShelters(defaultShelters);
        }

        // 3. Fetch Vehicles
        const { data: dbVehicles, error: vehError } = await client
          .from('vehicles')
          .select('*');

        if (vehError) throw vehError;

        if (dbVehicles && dbVehicles.length > 0) {
          const parsedVehicles = dbVehicles.map(v => ({
            ...v,
            path: typeof v.path === 'string' ? JSON.parse(v.path) : (v.path || []),
            equipment: typeof v.equipment === 'string' ? JSON.parse(v.equipment) : (v.equipment || []),
            crewNames: typeof v.crewNames === 'string' ? JSON.parse(v.crewNames) : (v.crewNames || []),
            location: typeof v.location === 'string' ? JSON.parse(v.location) : v.location
          }));
          
          // Merge database vehicles with our premium generated fleet (ensuring unique IDs)
          const dbIds = new Set(parsedVehicles.map(v => v.id));
          const uniqueDefaults = generateInitialFleet().filter(v => !dbIds.has(v.id));
          setVehicles([...parsedVehicles, ...uniqueDefaults] as Vehicle[]);
        } else {
          const initialFleet = generateInitialFleet();
          await client.from('vehicles').insert(initialFleet);
          setVehicles(initialFleet);
        }

        addNotification('DATABASE ACTIVE: ResQAI connected to Supabase Cloud.', 'success');
      } catch (err: any) {
        console.error('Supabase load error:', err);
        addNotification('DATABASE OFFLINE: Operating in local memory fallback.', 'warning');
      }
    };

    loadSupabaseData();
  }, [addNotification]);

  // Supabase Postgres Realtime Changes Listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const channel = client
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          
          if (eventType === 'INSERT') {
            setIncidents((prev) => {
              if (prev.some(i => i.id === newRow.id)) return prev;
              const newInc = newRow as Incident;
              addNotification(`EMERGENCY INTAKE (CLOUD): ${newInc.type} registered via ${newInc.reporter}.`, 'emergency');
              return [newInc, ...prev];
            });
          } else if (eventType === 'UPDATE') {
            setIncidents((prev) =>
              prev.map((i) => (i.id === newRow.id ? (newRow as Incident) : i))
            );
          } else if (eventType === 'DELETE') {
            setIncidents((prev) => prev.filter((i) => i.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [addNotification]);

  // Real-time cross-tab browser synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel('resqai_disaster_sync');

    bc.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'INCIDENT_ADDED' && payload) {
        setIncidents((prev) => {
          if (prev.some((i) => i.id === payload.id)) return prev;
          addNotification(
            `NETWORK INTAKE: New disaster (${payload.type}) reported at coordinates ${payload.location.lat.toFixed(3)}, ${payload.location.lng.toFixed(3)}.`,
            'emergency'
          );
          return [payload, ...prev];
        });
      } else if ((type === 'INCIDENT_UPDATED' || type === 'INCIDENT_RESOLVED') && payload) {
        setIncidents((prev) =>
          prev.map((i) => (i.id === payload.id ? { ...i, ...payload } : i))
        );
        if (type === 'INCIDENT_RESOLVED') {
          addNotification(
            `NETWORK NOTICE: Emergency ${payload.type} marked RESOLVED. Archived in saved location registry.`,
            'success'
          );
        }
      }
    };

    return () => {
      bc.close();
    };
  }, [addNotification]);

  // Keep localStorage automatically synced whenever incidents change
  useEffect(() => {
    if (incidents && incidents.length > 0) {
      persistIncidents(incidents);
    }
  }, [incidents]);

    // Dispatch a vehicle to an incident
    const dispatchVehicle = useCallback((vehicleId: string, incidentId: string) => {
      const incident = incidents.find((i) => i.id === incidentId);
      if (!incident) return;

      setVehicles((prevVehicles) =>
        prevVehicles.map((v) => {
          if (v.id === vehicleId) {
            // Generate optimized route considering hazards and closures
            const path = generateOptimizedPath(v.location, incident.location, hazards, roadClosures, v.type);
            
            const dist = getDistance(v.location, incident.location);
            const speed = v.type === 'Helicopter' ? 180 : v.type === 'Ambulance' || v.type === 'Mobile Medical' ? 65 : v.type === 'Police' || v.type === 'Highway Patrol' ? 70 : 50;
            const eta = Math.max(1, Math.round((dist / speed) * 60));

            addNotification(
              `DISPATCHED: ${v.name} (${v.type}) deployed to ${incident.type}. Distance: ${dist.toFixed(1)}km, ETA: ${eta} mins.`,
              'info'
            );

            // Update incident status to Dispatched and store vehicle ID
            setIncidents((prevIncidents) =>
              prevIncidents.map((inc) =>
                inc.id === incidentId ? { ...inc, status: 'Dispatched', assignedVehicleId: vehicleId } : inc
              )
            );

            // Sync dispatch to Supabase in background
            if (isSupabaseConfigured && supabase) {
              supabase!.from('incidents').update({ status: 'Dispatched', assignedVehicleId: vehicleId }).eq('id', incidentId).then();
              supabase!.from('vehicles').update({ 
                status: 'EnRoute', 
                activeIncidentId: incidentId,
                path,
                pathIndex: 0,
                speed,
                etaMinutes: eta,
                missionDescription: `Respond to ${incident.type} (Severity ${incident.severity}) at LAT ${incident.location.lat.toFixed(3)}, LNG ${incident.location.lng.toFixed(3)}.`
              }).eq('id', vehicleId).then();
            }

            return {
              ...v,
              status: 'EnRoute',
              activeIncidentId: incidentId,
              path,
              pathIndex: 0,
              speed,
              etaMinutes: eta,
              missionDescription: `Respond to ${incident.type} (Severity ${incident.severity}) at LAT ${incident.location.lat.toFixed(3)}, LNG ${incident.location.lng.toFixed(3)}.`
            };
          }
          return v;
        })
      );
    }, [incidents, hazards, roadClosures, addNotification]);

    // Add custom incident (Citizen SOS or user simulated)
    const addIncident = useCallback((incident: Omit<Incident, 'id' | 'reportedAt' | 'status'> & { status?: Incident['status'] }) => {
      const safeId = incident.type === 'POLICE_SOS' 
        ? `sos-${Date.now()}` 
        : `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

      const newInc: Incident = {
        ...incident,
        id: safeId,
        status: incident.type === 'POLICE_SOS' ? 'SOS Sent' : (incident.status || 'Pending'),
        reportedAt: timeStr,
        addressContext: incident.addressContext || `LAT ${incident.location.lat.toFixed(4)}, LNG ${incident.location.lng.toFixed(4)}`,
      };

      if (newInc.type === 'POLICE_SOS') {
        const policeVehicles = vehicles.filter(v => 
          (v.type === 'Police' || v.type === 'Traffic Police' || v.type === 'Highway Patrol') &&
          v.status === 'Idle' &&
          !v.activeIncidentId &&
          v.fuel > 10
        );

        let closestVehicle: Vehicle | null = null;
        let minDistance = Infinity;

        policeVehicles.forEach((v) => {
          const d = getDistance(v.location, newInc.location);
          if (d < minDistance) {
            minDistance = d;
            closestVehicle = v;
          }
        });

        if (closestVehicle) {
          newInc.assignedVehicleId = (closestVehicle as Vehicle).id;
          newInc.status = 'Police Notified';

          setVehicles((prev) =>
            prev.map((v) =>
              v.id === (closestVehicle as Vehicle).id
                ? {
                    ...v,
                    status: 'Idle',
                    activeIncidentId: newInc.id,
                    path: [],
                    pathIndex: 0,
                    speed: 0,
                    missionDescription: `Assigned to emergency Police SOS ${newInc.id}. Waiting for agent acceptance.`
                  }
                : v
            )
          );

          if (isSupabaseConfigured && supabase) {
            supabase!.from('vehicles').update({
              status: 'Idle',
              activeIncidentId: newInc.id,
              path: [],
              pathIndex: 0,
              speed: 0,
              missionDescription: `Assigned to emergency Police SOS ${newInc.id}. Waiting for agent acceptance.`
            }).eq('id', (closestVehicle as Vehicle).id).then();
          }
        }
      }

      setIncidents((prev) => {
        const updated = [newInc, ...prev];
        persistIncidents(updated);
        return updated;
      });
      addNotification(`NEW EMERGENCY: ${newInc.type} reported by ${newInc.reporter}. Severity Score: ${newInc.severity}/100.`, 'emergency');

      // Cross-tab real-time broadcast
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const ch = new BroadcastChannel('resqai_disaster_sync');
          ch.postMessage({ type: 'INCIDENT_ADDED', payload: newInc });
          ch.close();
        } catch (e) {}
      }

      // Sync creation to Supabase
      if (isSupabaseConfigured && supabase) {
        supabase!.from('incidents').insert([newInc]).then(({ error }) => {
          if (error) console.error('Supabase incident insert error:', error);
        });
      }
    
    // Dynamically expand hazard zones if it's a Fire or Flood
    if (newInc.type === 'Fire' || newInc.type === 'Flood') {
      setHazards((prev) => [
        ...prev,
        {
          id: `haz-${Date.now()}`,
          type: newInc.type,
          location: newInc.location,
          radiusKm: newInc.type === 'Fire' ? 0.4 : 0.5
        }
      ]);
    }

    // AI Autopilot Auto-Dispatch Logic
    if (autopilotEnabled && newInc.type !== 'POLICE_SOS') {
      setTimeout(() => {
        setVehicles((prevVehicles) => {
          const eligible = prevVehicles.filter(v => v.status === 'Idle' && v.fuel > 10);
          if (eligible.length === 0) {
            addNotification('AI AUTOPILOT WARNING: No available responders to dispatch.', 'warning');
            return prevVehicles;
          }

          let preferredTypes: string[] = [];
          if (newInc.type === 'Fire' || newInc.type === 'Chemical Leak') {
            preferredTypes = ['Fire Truck', 'SDRF', 'NDRF'];
          } else if (newInc.type === 'Flood' || newInc.type === 'Cyclone') {
            preferredTypes = ['Boat', 'Helicopter', 'NDRF', 'SDRF'];
          } else if (newInc.type === 'Landslide' || newInc.type === 'Fallen Trees' || newInc.type === 'Road Blockage' || newInc.type === 'Power Failure') {
            preferredTypes = ['Road Clearance', 'Utility Repair', 'Police', 'Highway Patrol', 'Traffic Police'];
          } else if (newInc.type === 'Medical Emergency' || newInc.type === 'Building Collapse') {
            preferredTypes = ['Ambulance', 'Mobile Medical'];
          }

          let candidates = eligible.filter(v => preferredTypes.includes(v.type));
          if (candidates.length === 0) {
            candidates = eligible;
          }

          let bestVehicle: Vehicle | null = null;
          let minDistance = Infinity;

          candidates.forEach((v) => {
            const d = getDistance(v.location, newInc.location);
            if (d < minDistance) {
              minDistance = d;
              bestVehicle = v;
            }
          });

          if (bestVehicle) {
            const targetVehicleId = (bestVehicle as Vehicle).id;
            setTimeout(() => {
              dispatchVehicle(targetVehicleId, newInc.id);
            }, 100);
          }
          return prevVehicles;
        });
      }, 600);
    }

    return newInc;
  }, [autopilotEnabled, dispatchVehicle, addNotification, hazards, roadClosures, incidents, vehicles, setVehicles]);

  // Update an incident (persisted locally and synced)
  const updateIncident = useCallback((updated: Incident) => {
    setIncidents((prev) => {
      const next = prev.map((i) => (i.id === updated.id ? updated : i));
      persistIncidents(next);
      return next;
    });

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const ch = new BroadcastChannel('resqai_disaster_sync');
        ch.postMessage({
          type: updated.status === 'Resolved' ? 'INCIDENT_RESOLVED' : 'INCIDENT_UPDATED',
          payload: updated,
        });
        ch.close();
      } catch (e) {}
    }

    if (isSupabaseConfigured && supabase) {
      supabase.from('incidents').update(updated).eq('id', updated.id).then();
    }
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark all notifications as read
  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Toggle road blockage
  const toggleRoadClosure = useCallback((location: Location) => {
    const exists = roadClosures.some((c) => Math.abs(c.lat - location.lat) < 0.0001 && Math.abs(c.lng - location.lng) < 0.0001);
    if (exists) {
      setRoadClosures((prev) => prev.filter((c) => !(Math.abs(c.lat - location.lat) < 0.0001 && Math.abs(c.lng - location.lng) < 0.0001)));
      addNotification('TRAFFIC: Route block cleared. Roadway reopened for response vehicles.', 'success');
    } else {
      setRoadClosures((prev) => [...prev, location]);
      addNotification('WARNING: Major road closure registered. Rerouting all active response vectors.', 'warning');
      
      // Force recalculation for any EnRoute vehicles
      setVehicles((prevVehicles) =>
        prevVehicles.map((v) => {
          if (v.status === 'EnRoute' && v.activeIncidentId) {
            const inc = incidents.find((i) => i.id === v.activeIncidentId);
            if (inc) {
              const updatedPath = generateOptimizedPath(v.location, inc.location, hazards, [...roadClosures, location], v.type);
              return {
                ...v,
                path: updatedPath,
                pathIndex: 0
              };
            }
          }
          return v;
        })
      );
    }
  }, [roadClosures, incidents, hazards, addNotification]);

  // Simulation loop effect (executes every 500ms for smooth, realistic movement)
  useEffect(() => {
    if (!isSimulating) return;

    let tickCount = 0;

    const interval = setInterval(() => {
      tickCount++;

      const isTimeTick = tickCount % 5 === 0;

      // 1. Every 5 ticks (2.5s), update simulation time & risk predictions
      if (isTimeTick) {
        setSimulationHour((prev) => {
          const nextHour = prev + 0.1;
          // Every full hour, run risk updates and alert warnings
          if (Math.floor(nextHour) > Math.floor(prev)) {
            // Fire/Flood spreads
            setHazards((prevHazards) => simulateThreatGrowth(1, prevHazards));
            
            // Hospital / Shelter reports
            const { incidents: currentIncidents } = stateRef.current;
            const activeCasualties = currentIncidents
              .filter((i) => i.status !== 'Resolved')
              .reduce((sum, i) => sum + i.casualtyEstimate, 0);
            const trapped = currentIncidents
              .filter((i) => i.status !== 'Resolved')
              .reduce((sum, i) => sum + i.trappedCount, 0);

            setHospitals((prevHosp) => {
              const predictions = predictHospitalLoad(1, prevHosp, activeCasualties);
              return prevHosp.map((h, index) => ({
                ...h,
                occupiedBeds: Math.round((predictions[index].occupancyPercent / 100) * h.totalBeds)
              }));
            });

            setShelters((prevShelter) => {
              const predictions = predictShelterLoad(1, prevShelter, trapped);
              return prevShelter.map((s, index) => {
                const updated = {
                  ...s,
                  occupied: Math.round((predictions[index].occupancyPercent / 100) * s.capacity),
                  waterSupply: Math.max(10, s.waterSupply - Math.round(Math.random() * 5)),
                  foodSupply: Math.max(10, s.foodSupply - Math.round(Math.random() * 4)),
                };
                if (updated.occupied >= updated.capacity) {
                  addNotification(`CRITICAL: Shelter ${s.name} is at maximum occupancy.`, 'warning');
                }
                return updated;
              });
            });
          }
          return nextHour;
        });
      }

      // 2. Move EnRoute and Patrolling Vehicles every 500ms based on realistic speed
      setVehicles((prevVehicles) => {
        const { hazards: currentHazards, roadClosures: currentClosures } = stateRef.current;
        const updated = prevVehicles.map((v) => {
          if ((v.status === 'EnRoute' || v.status === 'Idle') && v.path.length > 0) {
            // For emergency dispatches, hurry up and cover the distance in ~3-4 ticks (1.5s - 2.0s)
            const remainingDist = getDistanceKm(v.location, v.path[v.path.length - 1]);
            const distToTravel = v.status === 'Idle' 
              ? 40 * 0.02 
              : Math.max(2.5, remainingDist / 3.0);

            const { nextLocation, nextIndex } = advanceVehicleAlongPath(v.path, v.pathIndex, distToTravel);

            if (nextIndex < v.path.length - 1) {
              return {
                ...v,
                pathIndex: nextIndex,
                location: nextLocation,
                fuel: Math.max(0, v.fuel - 0.04), // lose fuel proportionally
              };
            } else {
                // Reached target!
                if (v.status === 'EnRoute') {
                  addNotification(`ARRIVED: ${v.name} has arrived at the emergency coordinate zone. Initiating rescue operations.`, 'success');
                  
                  // Set incident status to active
                  if (v.activeIncidentId) {
                    setIncidents((prevInc) =>
                      prevInc.map((inc) =>
                        inc.id === v.activeIncidentId ? { ...inc, status: 'Active' } : inc
                      )
                    );
                  }

                  // Sync arrival to Supabase
                  if (isSupabaseConfigured && supabase) {
                    if (v.activeIncidentId) {
                      supabase!.from('incidents').update({ status: 'Active' }).eq('id', v.activeIncidentId).then();
                    }
                    supabase!.from('vehicles').update({
                      status: 'Active',
                      speed: 0,
                      pathIndex: 0,
                      path: [],
                      location: v.path[v.path.length - 1]
                    }).eq('id', v.id).then();
                  }

                  return {
                    ...v,
                    status: 'Active' as const,
                    speed: 0,
                    pathIndex: 0,
                    path: [],
                    location: v.path[v.path.length - 1]
                  };
                } else {
                // Idle patrol finished leg, clear path so it chooses a new target next tick
                return {
                  ...v,
                  pathIndex: 0,
                  path: [],
                  location: v.path[v.path.length - 1]
                };
              }
            }
          } else if (v.status === 'Idle' && v.path.length === 0) {
            // Idle vehicles patrol randomly between emergency facilities
            const facilities = [
              { lat: 17.3662, lng: 78.4808 }, // Osmania Hospital
              { lat: 17.4244, lng: 78.5034 }, // Gandhi Hospital
              { lat: 17.4222, lng: 78.4530 }, // NIMS Hospital
              { lat: 17.6300, lng: 78.4900 }, // Medchal Warehouse
              { lat: 17.4530, lng: 78.4680 }, // Begumpet Airport
              { lat: 17.4850, lng: 78.5410 }, // NDRF HQ
              { lat: 17.3800, lng: 78.4300 }, // SDRF HQ
              { lat: 17.3600, lng: 78.4600 }, // EOC Command
              { lat: 17.4452, lng: 78.3440 }, // Gachibowli Stadium Relief Center
              { lat: 17.9700, lng: 79.6000 }, // Warangal Sports Complex
              { lat: 17.0600, lng: 79.2600 }, // Nalgonda Relief Camp
              { lat: 17.2510, lng: 80.1450 }  // Khammam Supply Depot
            ];
            
            // Choose a random facility distinct from current location
            let targetFac = facilities[Math.floor(Math.random() * facilities.length)];
            if (Math.abs(v.location.lat - targetFac.lat) < 0.05 && Math.abs(v.location.lng - targetFac.lng) < 0.05) {
              targetFac = facilities[(facilities.indexOf(targetFac) + 1) % facilities.length];
            }

            const patrolPath = generateOptimizedPath(v.location, targetFac, currentHazards, currentClosures, v.type);
            return {
              ...v,
              path: patrolPath,
              pathIndex: 0,
              speed: v.type === 'Helicopter' ? 120 : v.type === 'Drone' ? 60 : 35
            };
          }
          return v;
        });
        return updated;
      });

      // 3. Every 5 ticks (2.5s), tick active rescue operations
      if (isTimeTick) {
        setIncidents((prevIncidents) => {
          const { vehicles: currentVehicles } = stateRef.current;
          return prevIncidents.map((inc) => {
            if (inc.status === 'Active') {
              // Find if there is any active vehicle assigned to this incident
              const activeAssignedVehicles = currentVehicles.filter(
                (v) => v.status === 'Active' && v.activeIncidentId === inc.id
              );

              if (activeAssignedVehicles.length > 0) {
                // De-escalate trapped counts
                const rescueForce = activeAssignedVehicles.length;
                const nextTrapped = Math.max(0, inc.trappedCount - rescueForce);
                
                  if (nextTrapped === 0) {
                    // Incident resolved!
                    addNotification(`RESOLVED: Emergency at ${inc.type} scene cleared. Hazards secured, victims evacuated.`, 'success');
                    
                    // Return vehicles to base (idle status)
                    setVehicles((prevV) =>
                      prevV.map((v) =>
                        v.activeIncidentId === inc.id
                          ? { ...v, status: 'Idle', activeIncidentId: null, speed: 0 }
                          : v
                      )
                    );

                    // Sync resolution to Supabase
                    if (isSupabaseConfigured && supabase) {
                      supabase!.from('incidents').update({ 
                        status: 'Resolved', 
                        trappedCount: 0, 
                        casualtyEstimate: Math.max(0, inc.casualtyEstimate - 2) 
                      }).eq('id', inc.id).then();
                      
                      supabase!.from('vehicles').update({ 
                        status: 'Idle', 
                        activeIncidentId: null, 
                        speed: 0 
                      }).eq('activeIncidentId', inc.id).then();
                    }

                    const resolveTime = new Date().toLocaleTimeString('en-US', { hour12: false });
                    const resolvedInc: Incident = {
                      ...inc,
                      status: 'Resolved',
                      trappedCount: 0,
                      casualtyEstimate: Math.max(0, inc.casualtyEstimate - 2), // saved lives
                      resolvedAt: resolveTime,
                      resolutionSummary: `Operation concluded at ${resolveTime}. Hazard neutralized, victims evacuated to emergency shelter.`
                    };

                    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                      try {
                        const ch = new BroadcastChannel('resqai_disaster_sync');
                        ch.postMessage({ type: 'INCIDENT_RESOLVED', payload: resolvedInc });
                        ch.close();
                      } catch (e) {}
                    }

                    return resolvedInc;
                  } else {
                    // Sync de-escalation progress to Supabase
                    if (isSupabaseConfigured && supabase) {
                      supabase!.from('incidents').update({ 
                        trappedCount: nextTrapped, 
                        casualtyEstimate: Math.max(0, inc.casualtyEstimate - 1) 
                      }).eq('id', inc.id).then();
                    }

                    return {
                      ...inc,
                      trappedCount: nextTrapped,
                      casualtyEstimate: Math.max(0, inc.casualtyEstimate - 1)
                    };
                  }
              }
            }
            return inc;
          });
        });
      }

    }, 500);

    return () => clearInterval(interval);
  }, [isSimulating, addNotification]);

  return {
    incidents,
    setIncidents,
    vehicles,
    setVehicles,
    shelters,
    hospitals,
    warehouses,
    hazards,
    roadClosures,
    notifications,
    simulationHour,
    isSimulating,
    setIsSimulating,
    autopilotEnabled,
    setAutopilotEnabled,
    dispatchVehicle,
    addIncident,
    updateIncident,
    clearNotifications,
    markNotificationsRead,
    toggleRoadClosure,
    addNotification,
  };
}
