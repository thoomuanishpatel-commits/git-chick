import { Location, Warehouse, Vehicle, Incident, Hospital, Shelter } from './mockData';

// Adjacency graph representing real Telangana highway and street coordinates
const vertices = {
  Gachibowli: { lat: 17.4452, lng: 78.3440 },
  Punjagutta_NIMS: { lat: 17.4222, lng: 78.4530 },
  Begumpet: { lat: 17.4530, lng: 78.4680 },
  Secunderabad: { lat: 17.4390, lng: 78.4980 },
  Gandhi_Hosp: { lat: 17.4244, lng: 78.5034 },
  Jeedimetla: { lat: 17.5020, lng: 78.4610 },
  Jeedimetla_Leak: { lat: 17.5186, lng: 78.4554 },
  Medchal_Depot: { lat: 17.6300, lng: 78.4900 },
  Osmania_Hosp: { lat: 17.3662, lng: 78.4808 },
  EOC_Command: { lat: 17.3600, lng: 78.4600 },
  SDRF_HQ: { lat: 17.3800, lng: 78.4300 },
  NDRF_HQ: { lat: 17.4850, lng: 78.5410 },
  Chaderghat_Musi: { lat: 17.3685, lng: 78.4967 },
  Vikarabad_Ghat: { lat: 17.3300, lng: 77.9000 },
  Warangal: { lat: 17.9600, lng: 79.5900 },
  Nalgonda: { lat: 17.0600, lng: 79.2600 },
  Khammam: { lat: 17.2510, lng: 80.1450 },
  Suryapet_NH65: { lat: 17.1420, lng: 79.6120 },
};

type VertexName = keyof typeof vertices;

const adjacencyList: Record<VertexName, VertexName[]> = {
  Gachibowli: ['Punjagutta_NIMS', 'Vikarabad_Ghat'],
  Punjagutta_NIMS: ['Gachibowli', 'Begumpet', 'SDRF_HQ', 'EOC_Command'],
  Begumpet: ['Punjagutta_NIMS', 'Secunderabad'],
  Secunderabad: ['Begumpet', 'Gandhi_Hosp', 'Jeedimetla', 'NDRF_HQ'],
  Gandhi_Hosp: ['Secunderabad', 'NDRF_HQ'],
  Jeedimetla: ['Secunderabad', 'Jeedimetla_Leak'],
  Jeedimetla_Leak: ['Jeedimetla', 'Medchal_Depot'],
  Medchal_Depot: ['Jeedimetla_Leak'],
  Osmania_Hosp: ['EOC_Command', 'Chaderghat_Musi', 'Nalgonda'],
  EOC_Command: ['Punjagutta_NIMS', 'Osmania_Hosp', 'SDRF_HQ'],
  SDRF_HQ: ['Punjagutta_NIMS', 'EOC_Command'],
  NDRF_HQ: ['Secunderabad', 'Gandhi_Hosp', 'Warangal'],
  Chaderghat_Musi: ['Osmania_Hosp', 'Nalgonda'],
  Vikarabad_Ghat: ['Gachibowli'],
  Warangal: ['NDRF_HQ'],
  Nalgonda: ['Osmania_Hosp', 'Chaderghat_Musi', 'Suryapet_NH65'],
  Khammam: ['Suryapet_NH65'],
  Suryapet_NH65: ['Nalgonda', 'Khammam'],
};

const MUSI_RIVER_WAYPOINTS = [
  { lat: 17.3800, lng: 78.2500 },
  { lat: 17.3750, lng: 78.3500 },
  { lat: 17.3685, lng: 78.4967 },
  { lat: 17.3550, lng: 78.5800 },
  { lat: 17.3400, lng: 78.7000 },
  { lat: 17.3000, lng: 78.9500 },
  { lat: 17.2000, lng: 79.2500 }
];

// Haversine formula to compute distance in km
export function getDistance(p1: Location, p2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lng * Math.PI) / 180) * // Corrected formula alignment
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest vertex name in road network
function getNearestVertex(loc: Location): VertexName {
  let nearest: VertexName = 'EOC_Command';
  let minDist = Infinity;
  for (const name in vertices) {
    const dist = getDistance(loc, vertices[name as VertexName]);
    if (dist < minDist) {
      minDist = dist;
      nearest = name as VertexName;
    }
  }
  return nearest;
}

// Shortest path BFS solver for EOC road network
function bfsPath(start: VertexName, end: VertexName): VertexName[] {
  if (start === end) return [start];
  const queue: VertexName[][] = [[start]];
  const visited = new Set<VertexName>([start]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    
    for (const neighbor of adjacencyList[node] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        const newPath = [...path, neighbor];
        if (neighbor === end) return newPath;
        queue.push(newPath);
      }
    }
  }
  return [start, end];
}

// Interpolate points between two segments
function interpolatePoints(startLoc: Location, endLoc: Location, steps: number): Location[] {
  const pts: Location[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    pts.push({
      lat: startLoc.lat + (endLoc.lat - startLoc.lat) * f,
      lng: startLoc.lng + (endLoc.lng - startLoc.lng) * f
    });
  }
  return pts;
}

// Generate intermediate points representing a path.
export function generateOptimizedPath(
  start: Location,
  end: Location,
  hazards: { location: Location; radiusKm: number; type: string }[] = [],
  roadClosures: Location[] = [],
  vehicleType: string = 'Police'
): Location[] {
  // Aerial units fly directly
  if (vehicleType === 'Helicopter' || vehicleType === 'Drone') {
    return interpolatePoints(start, end, 15);
  }

  // Watercraft follow Musi watercourse
  if (vehicleType === 'Boat') {
    let nearestStartIdx = 0;
    let nearestEndIdx = 0;
    let minStartDist = Infinity;
    let minEndDist = Infinity;

    MUSI_RIVER_WAYPOINTS.forEach((pt, idx) => {
      const dS = getDistance(start, pt);
      if (dS < minStartDist) {
        minStartDist = dS;
        nearestStartIdx = idx;
      }
      const dE = getDistance(end, pt);
      if (dE < minEndDist) {
        minEndDist = dE;
        nearestEndIdx = idx;
      }
    });

    const riverPath: Location[] = [];
    const stepDirection = nearestStartIdx <= nearestEndIdx ? 1 : -1;
    let idx = nearestStartIdx;
    
    // Add start offset to river
    riverPath.push(start);
    while (idx !== nearestEndIdx + stepDirection) {
      riverPath.push(MUSI_RIVER_WAYPOINTS[idx]);
      idx += stepDirection;
    }
    riverPath.push(end);
    
    // Smooth final river route
    const finalRiverPath: Location[] = [];
    for (let i = 0; i < riverPath.length - 1; i++) {
      const sub = interpolatePoints(riverPath[i], riverPath[i + 1], 4);
      finalRiverPath.push(...sub.slice(0, -1));
    }
    finalRiverPath.push(riverPath[riverPath.length - 1]);
    return finalRiverPath;
  }

  // Ground vehicles follow EOC street/highway network
  const vStart = getNearestVertex(start);
  const vEnd = getNearestVertex(end);
  const routeNodes = bfsPath(vStart, vEnd);

  const rawRoute: Location[] = [];
  rawRoute.push(start);
  routeNodes.forEach((nodeName) => {
    rawRoute.push(vertices[nodeName]);
  });
  rawRoute.push(end);

  // Interpolate along network legs for smooth geometry alignment
  const roadPath: Location[] = [];
  for (let i = 0; i < rawRoute.length - 1; i++) {
    const legPoints = interpolatePoints(rawRoute[i], rawRoute[i + 1], 4);
    roadPath.push(...legPoints.slice(0, -1));
  }
  roadPath.push(rawRoute[rawRoute.length - 1]);

  // Adjust path points slightly to detour around active hazard zones or road closures
  const detourPath = roadPath.map((point) => {
    const adjustedPoint = { ...point };
    
    for (const hazard of hazards) {
      const dist = getDistance(adjustedPoint, hazard.location);
      if (dist < hazard.radiusKm) {
        const dLat = adjustedPoint.lat - hazard.location.lat;
        const dLng = adjustedPoint.lng - hazard.location.lng;
        const magnitude = Math.sqrt(dLat * dLat + dLng * dLng) || 0.001;
        
        // Push outward beyond the hazard radius
        const pushFactor = (hazard.radiusKm / 111.32) * 1.1; 
        adjustedPoint.lat = hazard.location.lat + (dLat / magnitude) * pushFactor;
        adjustedPoint.lng = hazard.location.lng + (dLng / magnitude) * pushFactor;
      }
    }

    for (const closure of roadClosures) {
      const dist = getDistance(adjustedPoint, closure);
      if (dist < 0.25) {
        adjustedPoint.lat += 0.0015;
        adjustedPoint.lng -= 0.0015;
      }
    }

    return adjustedPoint;
  });

  return detourPath;
}

// Score warehouses for supply dispatch based on distance, stock levels, and urgency
export interface WarehouseScore {
  warehouse: Warehouse;
  distanceKm: number;
  etaMinutes: number;
  availableStock: number;
  score: number;
}

export function rankWarehousesForSupply(
  destination: Location,
  itemType: 'food' | 'water' | 'medicine' | 'blankets' | 'medicalKits' | 'fuel',
  neededUnits: number,
  warehouses: Warehouse[]
): WarehouseScore[] {
  return warehouses
    .map((wh) => {
      const dist = getDistance(wh.location, destination);
      const stock = wh.supplies[itemType];
      const eta = Math.round((dist / 35) * 60 + 5); 

      const stockRatio = Math.min(stock / neededUnits, 1.5);
      const distancePenalty = dist * 2;
      const score = stockRatio * 100 - distancePenalty;

      return {
        warehouse: wh,
        distanceKm: Number(dist.toFixed(2)),
        etaMinutes: eta,
        availableStock: stock,
        score: Number(score.toFixed(1)),
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Assign vehicles to incidents based on capabilities, status, and proximity
export interface DispatchRecommendation {
  vehicle: Vehicle;
  distanceKm: number;
  etaMinutes: number;
  compatibilityScore: number;
  route: Location[];
}

export function recommendVehiclesForIncident(
  incident: Incident,
  vehicles: Vehicle[],
  hazards: { location: Location; radiusKm: number; type: string }[] = [],
  roadClosures: Location[] = []
): DispatchRecommendation[] {
  return vehicles
    .filter((v) => v.status === 'Idle' || v.status === 'EnRoute')
    .map((v) => {
      const dist = getDistance(v.location, incident.location);
      
      let typeScore = 20;
      if (incident.type === 'Fire') {
        if (v.type === 'Fire Truck') typeScore = 100;
        else if (v.type === 'Helicopter') typeScore = 80;
        else if (v.type === 'Ambulance') typeScore = 40;
      } else if (incident.type === 'Flood') {
        if (v.type === 'Boat') typeScore = 100;
        else if (v.type === 'Helicopter') typeScore = 90;
        else if (v.type === 'Supply Truck') typeScore = 50;
      } else if (incident.type === 'Building Collapse') {
        if (v.type === 'Ambulance') typeScore = 100;
        else if (v.type === 'Fire Truck') typeScore = 80; 
        else if (v.type === 'Helicopter') typeScore = 60;
      } else if (incident.type === 'Landslide') {
        if (v.type === 'Supply Truck') typeScore = 90; 
        else if (v.type === 'Fire Truck') typeScore = 70;
        else if (v.type === 'Police') typeScore = 80; 
      } else {
        if (v.type === 'Police') typeScore = 100;
        else if (v.type === 'Supply Truck') typeScore = 70;
      }

      const distancePenalty = dist * 4;
      const compatibilityScore = Math.max(0, Math.min(100, Math.round(typeScore - distancePenalty)));
      
      const avgSpeed = v.type === 'Helicopter' ? 180 : v.type === 'Boat' ? 30 : 45;
      const eta = Math.round((dist / avgSpeed) * 60 + 3); 

      const route = generateOptimizedPath(v.location, incident.location, hazards, roadClosures, v.type);

      return {
        vehicle: v,
        distanceKm: Number(dist.toFixed(2)),
        etaMinutes: eta,
        compatibilityScore,
        route,
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

// Simulate 48-hour threat growth based on elapsed hours
export function simulateThreatGrowth<T extends { location: Location; radiusKm: number; type: string }>(
  hours: number,
  originalHazards: T[]
): T[] {
  return originalHazards.map((h) => {
    let growthRate = 0.05; 
    if (h.type === 'Fire') {
      growthRate = 0.12; 
    } else if (h.type === 'Flood') {
      growthRate = 0.08; 
    } else if (h.type === 'Earthquake') {
      growthRate = 0; 
    }

    const newRadius = h.radiusKm + growthRate * hours;
    return {
      ...h,
      radiusKm: Number(newRadius.toFixed(3)),
    } as T;
  });
}

// Simulate hospital overload risk timeline
export function predictHospitalLoad(
  hours: number,
  hospitals: Hospital[],
  activeCasualties: number
): { id: string; name: string; occupancyPercent: number; overloadRisk: 'Low' | 'Medium' | 'High' }[] {
  return hospitals.map((h) => {
    const hoursFactor = Math.min(hours / 24, 1.0);
    const addedPatients = Math.round(activeCasualties * 0.3 * hoursFactor);
    const totalOccupied = Math.min(h.totalBeds, h.occupiedBeds + addedPatients);
    const occupancyPercent = Math.round((totalOccupied / h.totalBeds) * 100);
    
    let overloadRisk: 'Low' | 'Medium' | 'High' = 'Low';
    if (occupancyPercent > 90) overloadRisk = 'High';
    else if (occupancyPercent > 75) overloadRisk = 'Medium';

    return {
      id: h.id,
      name: h.name,
      occupancyPercent,
      overloadRisk,
    };
  });
}

// Simulate shelter capacity overloading timeline
export function predictShelterLoad(
  hours: number,
  shelters: Shelter[],
  trappedVictims: number
): { id: string; name: string; occupancyPercent: number; supplyStatus: 'Optimal' | 'Critical' | 'Depleted' }[] {
  return shelters.map((s) => {
    const hoursFactor = Math.min(hours / 12, 1.0);
    const addedEvacuees = Math.round(trappedVictims * 0.5 * hoursFactor);
    const totalOccupied = Math.min(s.capacity, s.occupied + addedEvacuees);
    const occupancyPercent = Math.round((totalOccupied / s.capacity) * 100);

    const resourceDegradation = Math.min(35, Math.round(hours * 0.8 * (occupancyPercent / 100)));
    const remainingResources = Math.max(0, s.waterSupply - resourceDegradation);

    let supplyStatus: 'Optimal' | 'Critical' | 'Depleted' = 'Optimal';
    if (remainingResources < 20) supplyStatus = 'Depleted';
    else if (remainingResources < 50) supplyStatus = 'Critical';

    return {
      id: s.id,
      name: s.name,
      occupancyPercent,
      supplyStatus,
    };
  });
}
