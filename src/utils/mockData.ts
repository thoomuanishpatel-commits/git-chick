export interface Location {
  lat: number;
  lng: number;
}

export type IncidentCategory =
  | 'Disaster Response'
  | 'Public Safety'
  | 'Animal Rescue'
  | 'Veterinary Services'
  | 'Infrastructure Issues'
  | 'Utility Failures'
  | 'Environmental Hazards';

export type IncidentType =
  // Disaster Types
  | 'Flood'
  | 'Fire'
  | 'Earthquake'
  | 'Building Collapse'
  | 'Landslide'
  | 'Road Blockage'
  | 'Rainfall'
  | 'Chemical Leak'
  | 'Fallen Trees'
  | 'Power Failure'
  | 'Cyclone'
  | 'Medical Emergency'
  | 'Rescue Request'
  | 'Missing Person'
  | 'Evacuation Zone'
  // Civic & Animal Rescue Types
  | 'Snake Sighting'
  | 'Wild Animal Rescue'
  | 'Injured Stray Animal'
  | 'Veterinary Emergency'
  | 'Animal Disease Outbreak'
  | 'Dead Animal Removal'
  | 'Illegal Wildlife Sighting'
  | 'Bee/Wasp Swarm'
  | 'Monkey Nuisance'
  | 'Cattle on Road'
  | 'Dog Bite'
  | 'Dangerous Animal Attack'
  | 'Water Contamination'
  | 'Sewage Overflow'
  | 'Fallen Electric Pole'
  | 'Broken Traffic Signal'
  | 'Large Pothole'
  | 'Open Manhole'
  | 'Building Safety Hazard';

export interface Incident {
  id: string;
  type: IncidentType;
  category: IncidentCategory;
  severity: number; // 0-100
  status:
    | 'Pending'
    | 'Dispatched'
    | 'Active'
    | 'Resolved'
    | 'Reported'
    | 'Team Assigned'
    | 'En Route'
    | 'Rescued'
    | 'Closed';
  location: Location;
  description: string;
  casualtyEstimate: number;
  trappedCount: number;
  requiredResources: string[];
  reportedAt: string;
  reporter: 'Satellite' | 'Citizen SOS' | 'Emergency Patrol' | 'Sensor Network' | 'Citizen Portal';
  aiPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  etaResolution: number; // hours
  assignedVehicleId?: string | null;
  needsSOSValidation?: boolean;
  
  // Custom details for dynamic safety & veterinary issues:
  snakeDetails?: {
    urgency: 'Low' | 'Medium' | 'High';
    environment: 'Indoors' | 'Outdoors';
    recommendation: string;
  };
  animalRescueDetails?: {
    animalType: string;
    condition: string;
    recommendation: string;
    summary: string;
  };
  civicDetails?: {
    recommendedDepartment: string;
    reportSummary: string;
  };
}

export type VehicleType =
  | 'Ambulance'
  | 'Fire Truck'
  | 'Police'
  | 'Boat'
  | 'Helicopter'
  | 'Supply Truck'
  | 'Traffic Police'
  | 'Highway Patrol'
  | 'Disaster Response'
  | 'Road Clearance'
  | 'Utility Repair'
  | 'Mobile Medical'
  | 'NDRF'
  | 'SDRF'
  | 'Drone';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  status: 'Idle' | 'EnRoute' | 'Active' | 'Maintenance';
  location: Location;
  speed: number; // km/h
  fuel: number; // %
  activeIncidentId?: string | null;
  path: Location[];
  pathIndex: number;
  equipment: string[];
  crewSize: number;
  crewNames: string[];
  etaMinutes: number | null;
  missionDescription: string | null;
}

export interface Shelter {
  id: string;
  name: string;
  location: Location;
  capacity: number;
  occupied: number;
  waterSupply: number; // %
  foodSupply: number; // %
  medicalSupply: number; // %
}

export interface Hospital {
  id: string;
  name: string;
  location: Location;
  totalBeds: number;
  occupiedBeds: number;
  icuAvailable: number; // %
}

export interface Warehouse {
  id: string;
  name: string;
  location: Location;
  supplies: {
    food: number; // boxes
    water: number; // liters
    medicine: number; // kits
    blankets: number; // count
    medicalKits: number; // count
    fuel: number; // liters
  };
}

// Center coordinates for Telangana State, India
export const MAP_CENTER: Location = { lat: 17.8000, lng: 79.1000 };

export const defaultIncidents: Incident[] = [
  {
    id: 'inc-101',
    type: 'Flood',
    category: 'Disaster Response',
    severity: 92,
    status: 'Active',
    location: { lat: 17.3685, lng: 78.4967 }, // Musi River, Chaderghat (Hyderabad)
    description: 'Musi river level rising rapidly due to high inflows. Basements and low-lying slums in Chaderghat inundated. 15 residents stranded on terraces.',
    casualtyEstimate: 4,
    trappedCount: 15,
    requiredResources: ['NDRF Rescue Boat', 'SDRF Evacuation Team', 'Ambulance'],
    reportedAt: '10:04:12',
    reporter: 'Sensor Network',
    aiPriority: 'CRITICAL',
    etaResolution: 3.5,
    assignedVehicleId: 'veh-3'
  },
  {
    id: 'inc-102',
    type: 'Chemical Leak',
    category: 'Environmental Hazards',
    severity: 85,
    status: 'Active',
    location: { lat: 17.5186, lng: 78.4554 }, // Jeedimetla Industrial Area
    description: 'Chlorine gas leakage detected in industrial storage tanks. Secondary thermal signatures registered. Cordoning needed.',
    casualtyEstimate: 8,
    trappedCount: 3,
    requiredResources: ['TG-Fire Engine', 'SDRF Hazmat Team'],
    reportedAt: '10:12:45',
    reporter: 'Satellite',
    aiPriority: 'CRITICAL',
    etaResolution: 2.0,
    assignedVehicleId: 'veh-2'
  },
  {
    id: 'inc-103',
    type: 'Building Collapse',
    category: 'Disaster Response',
    severity: 78,
    status: 'Pending',
    location: { lat: 17.4344, lng: 78.5012 }, // Secunderabad commercial block
    description: 'Structural balcony failure in commercial zone. Heavy debris blocks pedestrian lanes. 8 citizens reported trapped under beams.',
    casualtyEstimate: 2,
    trappedCount: 8,
    requiredResources: ['SDRF Rescue Team', 'Ambulance', 'Concrete Cutters'],
    reportedAt: '10:22:00',
    reporter: 'Citizen SOS',
    aiPriority: 'HIGH',
    etaResolution: 4.0,
    assignedVehicleId: null
  },
  {
    id: 'inc-104',
    type: 'Landslide',
    category: 'Disaster Response',
    severity: 65,
    status: 'Active',
    location: { lat: 17.3300, lng: 77.9000 }, // Ananthagiri Hills, Vikarabad
    description: 'Mudslide on the ghat road blocks commuter access corridors. Severed telephone cables and minor damage to passing light vehicles.',
    casualtyEstimate: 0,
    trappedCount: 0,
    requiredResources: ['Bulldozer Unit', 'TG-Police Patrol'],
    reportedAt: '09:55:10',
    reporter: 'Emergency Patrol',
    aiPriority: 'HIGH',
    etaResolution: 1.5,
    assignedVehicleId: 'veh-9'
  },
  {
    id: 'inc-105',
    type: 'Road Blockage',
    category: 'Infrastructure Issues',
    severity: 45,
    status: 'Resolved',
    location: { lat: 17.1420, lng: 79.6120 }, // NH-65 highway near Suryapet
    description: 'Multi-truck collision blocks Hyderabad-Vijayawada Highway (NH-65) lanes. Traffic logjam extending over 3km. Redirection completed.',
    casualtyEstimate: 1,
    trappedCount: 0,
    requiredResources: ['TG-Police Patrol', 'Tow Crane Unit'],
    reportedAt: '09:15:30',
    reporter: 'Citizen SOS',
    aiPriority: 'MEDIUM',
    etaResolution: 0.8,
    assignedVehicleId: 'veh-6'
  },
  {
    id: 'inc-106',
    type: 'Medical Emergency',
    category: 'Disaster Response',
    severity: 50,
    status: 'Pending',
    location: { lat: 17.4452, lng: 78.3440 }, // Gachibowli Stadium Camp
    description: 'Citizen at shelter camp reporting signs of severe cardiac distress. Paramedic dispatch requested.',
    casualtyEstimate: 0,
    trappedCount: 0,
    requiredResources: ['Ambulance'],
    reportedAt: '10:28:10',
    reporter: 'Sensor Network',
    aiPriority: 'HIGH',
    etaResolution: 1.0,
    assignedVehicleId: null
  },
  {
    id: 'inc-107',
    type: 'Power Failure',
    category: 'Utility Failures',
    severity: 40,
    status: 'Pending',
    location: { lat: 17.9689, lng: 79.5941 }, // Warangal Basin
    description: 'Grid substation transformer failure due to heavy rain. Outage affecting municipal water pumping systems.',
    casualtyEstimate: 0,
    trappedCount: 0,
    requiredResources: ['Utility Repair Team'],
    reportedAt: '10:31:00',
    reporter: 'Sensor Network',
    aiPriority: 'MEDIUM',
    etaResolution: 2.5,
    assignedVehicleId: null
  },
  {
    id: 'inc-108',
    type: 'Snake Sighting',
    category: 'Animal Rescue',
    severity: 55,
    status: 'Reported',
    location: { lat: 17.4485, lng: 78.3560 }, // Gachibowli Residential Sector
    description: 'Spectacled Cobra sighted inside the kitchen pantry of a residential apartment complex. Residents have locked the door but require urgent extraction.',
    casualtyEstimate: 0,
    trappedCount: 0,
    requiredResources: ['Wildlife Rescue Team'],
    reportedAt: '10:34:00',
    reporter: 'Citizen SOS',
    aiPriority: 'MEDIUM',
    etaResolution: 1.2,
    assignedVehicleId: null,
    snakeDetails: {
      urgency: 'High',
      environment: 'Indoors',
      recommendation: 'Do not approach the reptile. Keep the door closed and sealed. Alerting the Telangana Forest Department Snake Rescue unit.'
    }
  },
  {
    id: 'inc-109',
    type: 'Injured Stray Animal',
    category: 'Veterinary Services',
    severity: 38,
    status: 'Pending',
    location: { lat: 17.4390, lng: 78.4980 }, // Secunderabad Central Road
    description: 'Stray dog hit by a vehicle. Sighted lying on the side of the road with a hind leg fracture. Conscious but unable to move.',
    casualtyEstimate: 0,
    trappedCount: 0,
    requiredResources: ['Veterinary Rescue Van'],
    reportedAt: '10:36:12',
    reporter: 'Citizen SOS',
    aiPriority: 'LOW',
    etaResolution: 2.0,
    assignedVehicleId: null,
    animalRescueDetails: {
      animalType: 'Stray Dog',
      condition: 'Hind leg fracture, highly distressed',
      recommendation: 'Dispatch GHMC Veterinary Rescue team for splinting and relocation to safety shelter.',
      summary: 'Injured canine requires trauma stabilization and splinting.'
    }
  },
  {
    id: 'inc-110',
    type: 'Large Pothole',
    category: 'Infrastructure Issues',
    severity: 45,
    status: 'Pending',
    location: { lat: 17.4420, lng: 78.3750 }, // Hitech City Road Corridor
    description: 'Deep pothole formed at high-speed commuter junction, causing minor vehicle detours and representing a high collision risk for two-wheelers.',
    casualtyEstimate: 0,
    trappedCount: 0,
    requiredResources: ['Road Maintenance Crew'],
    reportedAt: '10:38:00',
    reporter: 'Emergency Patrol',
    aiPriority: 'LOW',
    etaResolution: 5.0,
    assignedVehicleId: null,
    civicDetails: {
      recommendedDepartment: 'GHMC Engineering Branch',
      reportSummary: 'Asphalt cold-mix repair dispatch scheduled.'
    }
  }
];

export const defaultVehicles: Vehicle[] = [
  {
    id: 'veh-1',
    name: 'EMRI 108 Ambulance (Medic-1)',
    type: 'Ambulance',
    status: 'Idle',
    location: { lat: 17.3662, lng: 78.4808 }, // Near Osmania Hospital
    speed: 0,
    fuel: 88,
    path: [],
    pathIndex: 0,
    equipment: ['Oxygen Cylinders', 'Trauma Kit', 'Cardiac Monitors', 'Emergency Drugs'],
    crewSize: 3,
    crewNames: ['K. Rama Rao (Paramedic)', 'P. Ramesh (EMT)', 'S. Naidu (Driver)'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-2',
    name: 'TG-Fire Engine 32 (Jeedimetla)',
    type: 'Fire Truck',
    status: 'Active',
    location: { lat: 17.5020, lng: 78.4610 },
    speed: 45,
    fuel: 72,
    activeIncidentId: 'inc-102',
    path: [
      { lat: 17.5020, lng: 78.4610 },
      { lat: 17.5110, lng: 78.4590 },
      { lat: 17.5186, lng: 78.4554 }
    ],
    pathIndex: 0,
    equipment: ['Foam Extinguishers', 'Water Tank (5000L)', 'Chemical Suits', 'Respiratory Masks'],
    crewSize: 5,
    crewNames: ['M. Srinivas (Commander)', 'G. Venu', 'K. Ali', 'B. Prasad', 'V. Shekhar'],
    etaMinutes: 4,
    missionDescription: 'Deploy foam arrest lines to containment storage tank #3.'
  },
  {
    id: 'veh-3',
    name: 'NDRF Water Rescue-Boat 08',
    type: 'NDRF',
    status: 'Active',
    location: { lat: 17.3820, lng: 78.4520 }, // Musi upper stream base
    speed: 15,
    fuel: 95,
    activeIncidentId: 'inc-101',
    path: [
      { lat: 17.3820, lng: 78.4520 },
      { lat: 17.3750, lng: 78.4720 },
      { lat: 17.3685, lng: 78.4967 }
    ],
    pathIndex: 0,
    equipment: ['Inflatable Boat', 'Lifebuoys x12', 'Flooding Suits', 'Rescue Ropes'],
    crewSize: 6,
    crewNames: ['Inspector Amit Singh', 'N. Kumar', 'S. Yadav', 'R. Meena', 'D. Paswan', 'J. Soren'],
    etaMinutes: 6,
    missionDescription: 'Evacuate stranded terrace occupants in Chaderghat slums.'
  },
  {
    id: 'veh-4',
    name: 'TSDMA Air Chetak (Air-1)',
    type: 'Helicopter',
    status: 'Idle',
    location: { lat: 17.4530, lng: 78.4680 }, // Begumpet Airport Helipad
    speed: 0,
    fuel: 60,
    path: [],
    pathIndex: 0,
    equipment: ['Winch Cradle', 'Thermal Camera', 'Rations Drop Packs', 'SDRF Para-Medic'],
    crewSize: 4,
    crewNames: ['Wing Cmdr S. Dutta', 'Co-Pilot A. Verma', 'SDRF J. Reddy', 'Flight Medic A. Roy'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-5',
    name: 'TSDMA Supply Carrier 14',
    type: 'Supply Truck',
    status: 'Idle',
    location: { lat: 17.6250, lng: 78.4880 }, // Medchal Warehouse Depot
    speed: 0,
    fuel: 82,
    path: [],
    pathIndex: 0,
    equipment: ['Drinking Water Cans x200', 'Rations Dry Pack x150', 'Tarpaulins x100'],
    crewSize: 2,
    crewNames: ['D. Balaraju (Driver)', 'M. Malliah'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-6',
    name: 'TG-Police Patrol Cruiser 12',
    type: 'Police',
    status: 'Active',
    location: { lat: 17.1500, lng: 79.5900 },
    speed: 30,
    fuel: 67,
    activeIncidentId: 'inc-105',
    path: [
      { lat: 17.1500, lng: 79.5900 },
      { lat: 17.1460, lng: 79.6000 },
      { lat: 17.1420, lng: 79.6120 }
    ],
    pathIndex: 0,
    equipment: ['Highway Cones', 'LED Barricades', 'Megaphone', 'Traffic Signages'],
    crewSize: 2,
    crewNames: ['Sub-Inspector M. Kanth', 'Constable R. Goud'],
    etaMinutes: 2,
    missionDescription: 'Redirect NH-65 traffic flow to bypass collector loops.'
  },
  {
    id: 'veh-7',
    name: 'TG-Highway Patrol 09 (Nalgonda)',
    type: 'Highway Patrol',
    status: 'Idle',
    location: { lat: 17.0600, lng: 79.2600 },
    speed: 0,
    fuel: 89,
    path: [],
    pathIndex: 0,
    equipment: ['Medical Trauma Box', 'Highway Flare Kits', 'Speed Radar Gun'],
    crewSize: 2,
    crewNames: ['ASI J. Sudhakar', 'Constable Y. Babu'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-8',
    name: 'Hyderabad Koti Traffic Police',
    type: 'Traffic Police',
    status: 'Idle',
    location: { lat: 17.3820, lng: 78.4830 },
    speed: 0,
    fuel: 94,
    path: [],
    pathIndex: 0,
    equipment: ['Reflector Vests', 'Megaphone', 'Traffic Warning Signs'],
    crewSize: 2,
    crewNames: ['ASI Mohd Rafi', 'Constable P. Raju'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-9',
    name: 'TSDMA Earth Mover (Clearance-1)',
    type: 'Road Clearance',
    status: 'Active',
    location: { lat: 17.3400, lng: 77.9200 },
    speed: 25,
    fuel: 58,
    activeIncidentId: 'inc-104',
    path: [
      { lat: 17.3400, lng: 77.9200 },
      { lat: 17.3350, lng: 77.9100 },
      { lat: 17.3300, lng: 77.9000 }
    ],
    pathIndex: 0,
    equipment: ['Hydraulic Pusher Blade', 'Pneumatic Drill', 'Cables & Shackles'],
    crewSize: 2,
    crewNames: ['T. Venkat (Operator)', 'K. Bhaskar (Spotter)'],
    etaMinutes: 3,
    missionDescription: 'Clear landslide debris blocking the ghat road.'
  },
  {
    id: 'veh-10',
    name: 'TSSPDCL Power Repair Alpha',
    type: 'Utility Repair',
    status: 'Idle',
    location: { lat: 17.9500, lng: 79.5800 },
    speed: 0,
    fuel: 75,
    path: [],
    pathIndex: 0,
    equipment: ['Insulated Tools', 'Bucket Lift Boom', 'Transformer Cable Reels'],
    crewSize: 4,
    crewNames: ['K. Chandraiah (Line-Inspector)', 'J. Mahesh', 'G. Naresh', 'M. Satish'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-11',
    name: 'SDRF Rescue Unit (SDRF-12)',
    type: 'SDRF',
    status: 'Idle',
    location: { lat: 17.3800, lng: 78.4300 },
    speed: 0,
    fuel: 91,
    path: [],
    pathIndex: 0,
    equipment: ['Hydraulic Spreader', 'Concrete Saw', 'Rope Harness Systems'],
    crewSize: 6,
    crewNames: ['SDRF Cmdr R. Reddy', 'V. Raju', 'S. Kumar', 'H. Singh', 'T. Lal', 'N. Rao'],
    etaMinutes: null,
    missionDescription: null
  },
  {
    id: 'veh-12',
    name: 'TSDMA Mobile Trauma ICU (Medic-2)',
    type: 'Mobile Medical',
    status: 'Idle',
    location: { lat: 17.4244, lng: 78.5034 }, // Gandhi Hospital
    speed: 0,
    fuel: 85,
    path: [],
    pathIndex: 0,
    equipment: ['ICU Ventilator', 'Advanced Emergency Drug Kit', 'Surgical Set'],
    crewSize: 3,
    crewNames: ['Dr. P. Sirisha (MD)', 'Staff Nurse J. Mary', 'D. Shankar (Driver)'],
    etaMinutes: null,
    missionDescription: null
  }
];

export const defaultShelters: Shelter[] = [
  {
    id: 'shlt-1',
    name: 'Gachibowli Indoor Stadium Camp',
    location: { lat: 17.4452, lng: 78.3440 }, // Gachibowli, Hyderabad
    capacity: 2000,
    occupied: 650,
    waterSupply: 85,
    foodSupply: 78,
    medicalSupply: 65
  },
  {
    id: 'shlt-2',
    name: 'Warangal Regional Sports Complex Shelter',
    location: { lat: 17.9700, lng: 79.6000 }, // Hanamkonda / Warangal
    capacity: 1000,
    occupied: 280,
    waterSupply: 90,
    foodSupply: 88,
    medicalSupply: 92
  },
  {
    id: 'shlt-3',
    name: 'Nalgonda Govt Junior College relief camp',
    location: { lat: 17.0600, lng: 79.2600 }, // Nalgonda
    capacity: 800,
    occupied: 760, // Running full
    waterSupply: 38,
    foodSupply: 40,
    medicalSupply: 25
  }
];

export const defaultHospitals: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'Osmania General Hospital (Afzal Gunj)',
    location: { lat: 17.3662, lng: 78.4808 }, // Afzal Gunj, Hyderabad
    totalBeds: 1000,
    occupiedBeds: 920,
    icuAvailable: 6
  },
  {
    id: 'hosp-2',
    name: 'Gandhi Medical College Hospital (Secunderabad)',
    location: { lat: 17.4244, lng: 78.5034 }, // Musheerabad / Secunderabad
    totalBeds: 1200,
    occupiedBeds: 980,
    icuAvailable: 12
  },
  {
    id: 'hosp-3',
    name: 'NIMS University Hospital (Punjagutta)',
    location: { lat: 17.4222, lng: 78.4530 }, // Punjagutta, Hyderabad
    totalBeds: 800,
    occupiedBeds: 620,
    icuAvailable: 18
  }
];

export const defaultWarehouses: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'TSDMA Central Supplies Depot (Medchal)',
    location: { lat: 17.6300, lng: 78.4900 },
    supplies: {
      food: 3000,
      water: 12000,
      medicine: 2000,
      blankets: 4000,
      medicalKits: 1500,
      fuel: 25000
    }
  },
  {
    id: 'wh-2',
    name: 'Civil Supplies Depot (Khammam)',
    location: { lat: 17.2510, lng: 80.1450 },
    supplies: {
      food: 1000,
      water: 4000,
      medicine: 800,
      blankets: 1200,
      medicalKits: 400,
      fuel: 8000
    }
  }
];

// EOC Police and Fire Facility Nodes
export interface Facility {
  id: string;
  name: string;
  location: Location;
  type: 'Police' | 'Fire';
}

export const defaultPoliceStations: Facility[] = [
  { id: 'pol-1', name: 'Cyberabad Police HQ (Gachibowli)', location: { lat: 17.4430, lng: 78.3480 }, type: 'Police' },
  { id: 'pol-2', name: 'Hyderabad Central Police HQ (Koti)', location: { lat: 17.3850, lng: 78.4867 }, type: 'Police' },
  { id: 'pol-3', name: 'Warangal Police HQ (Hanamkonda)', location: { lat: 17.9600, lng: 79.5900 }, type: 'Police' },
];

export const defaultFireStations: Facility[] = [
  { id: 'fire-1', name: 'Secunderabad Fire HQ', location: { lat: 17.4390, lng: 78.4980 }, type: 'Fire' },
  { id: 'fire-2', name: 'Jeedimetla Fire Station', location: { lat: 17.5020, lng: 78.4610 }, type: 'Fire' },
  { id: 'fire-3', name: 'Karimnagar Fire Station', location: { lat: 18.4300, lng: 79.1300 }, type: 'Fire' },
];

// Spawning points configuration for 100+ dense fleet
const spawnFacilities = [
  { name: 'Osmania Hospital Base', loc: { lat: 17.3662, lng: 78.4808 }, types: ['Ambulance', 'Mobile Medical'] },
  { name: 'Gandhi Hospital Base', loc: { lat: 17.4244, lng: 78.5034 }, types: ['Ambulance', 'Mobile Medical'] },
  { name: 'NIMS University Hospital', loc: { lat: 17.4222, lng: 78.4530 }, types: ['Ambulance', 'Mobile Medical'] },
  { name: 'Medchal Supplies Depot', loc: { lat: 17.6300, lng: 78.4900 }, types: ['Supply Truck', 'Disaster Response'] },
  { name: 'Begumpet Airport Helipad', loc: { lat: 17.4530, lng: 78.4680 }, types: ['Helicopter', 'Drone'] },
  { name: 'NDRF Central HQ', loc: { lat: 17.4850, lng: 78.5410 }, types: ['NDRF', 'Boat'] },
  { name: 'SDRF Command HQ', loc: { lat: 17.3800, lng: 78.4300 }, types: ['SDRF', 'Boat'] },
  { name: 'TSDMA Command Center', loc: { lat: 17.3600, lng: 78.4600 }, types: ['Police', 'Disaster Response'] },
  { name: 'Secunderabad Fire Station', loc: { lat: 17.4390, lng: 78.4980 }, types: ['Fire Truck', 'Road Clearance'] },
  { name: 'Jeedimetla Fire Station', loc: { lat: 17.5020, lng: 78.4610 }, types: ['Fire Truck', 'Utility Repair'] },
  { name: 'Cyberabad Police HQ', loc: { lat: 17.4430, lng: 78.3480 }, types: ['Police', 'Traffic Police', 'Highway Patrol'] },
  { name: 'Warangal Police HQ', loc: { lat: 17.9600, lng: 79.5900 }, types: ['Police', 'Traffic Police', 'Ambulance'] },
  { name: 'Karimnagar Fire Station', loc: { lat: 18.4300, lng: 79.1300 }, types: ['Fire Truck', 'Ambulance'] },
  { name: 'Nalgonda Relief Center', loc: { lat: 17.0600, lng: 79.2600 }, types: ['Supply Truck', 'Disaster Response'] },
  { name: 'Khammam Supply Depot', loc: { lat: 17.2510, lng: 80.1450 }, types: ['Supply Truck', 'Utility Repair'] }
];

const vehicleNamesMap: Record<string, string[]> = {
  Ambulance: ['EMRI 108 Medic', 'NIMS Trauma Unit', 'Gandhi Rescue EMS', 'RedCross Ambulance'],
  'Fire Truck': ['TG-Fire Engine', 'Industrial Flame Interceptor', 'Municipal Water Tender'],
  Police: ['Rachakonda Patrol', 'Cyberabad Cruiser', 'EOC Dispatch Police', 'Telangana State Police'],
  Boat: ['NDRF Water-Raft', 'SDRF Inflatable Boat', 'Flood Evac Speedboat'],
  Helicopter: ['Air Chetak Rescue', 'SDRF Air Ambulance', 'Copter Surveillance'],
  'Supply Truck': ['TSDMA Supply Truck', 'Civil Supplies Carrier', 'EOC Food Transport'],
  'Traffic Police': ['Hyderabad Traffic Patrol', 'Cyberabad Traffic Police', 'Rachakonda Interceptor'],
  'Highway Patrol': ['Highway Police Patrol', 'NH-65 Traffic Cruiser'],
  'Disaster Response': ['TSDMA Emergency SUV', 'Govt Command SUV'],
  'Road Clearance': ['TSDMA Earth Mover JCB', 'Caterpillar Bulldozer', 'Hydraulic Excavator'],
  'Utility Repair': ['TSSPDCL Power Repair Van', 'Grid Line Maintenance Utility'],
  'Mobile Medical': ['Mobile Trauma ICU Unit', 'Govt Vaccine Express'],
  NDRF: ['NDRF Disaster Squad Carrier', 'NDRF Response Unit'],
  SDRF: ['SDRF Rescue Van', 'SDRF Tactical Unit'],
  Drone: ['UAV Surveillance Quadcopter', 'TSDMA Eagle Drone', 'EOC Scout Drone']
};

export function generateInitialFleet(): Vehicle[] {
  const fleet = [...defaultVehicles];
  
  // Dedicated Mobile Agent Alpha
  fleet.unshift({
    id: 'veh-agent-1',
    name: '👤 TSDMA Mobile Agent (Alpha)',
    type: 'Disaster Response',
    status: 'Idle',
    location: { lat: 17.3850, lng: 78.4867 },
    speed: 0,
    fuel: 100,
    path: [],
    pathIndex: 0,
    equipment: ['Satellite Phone', 'Thermal Drone Scout', 'Radiological Geiger Counter'],
    crewSize: 3,
    crewNames: ['Agent K. Siva (Lead)', 'Agent P. Comms', 'Operator R. Goud'],
    etaMinutes: null,
    missionDescription: 'Conducting live EOC reconnaissance and structural hazard patrols.'
  });

  let idCounter = 13;

  for (let i = 0; i < 100; i++) {
    const facility = spawnFacilities[Math.floor(Math.random() * spawnFacilities.length)];
    const type = facility.types[Math.floor(Math.random() * facility.types.length)] as VehicleType;
    const names = vehicleNamesMap[type] || ['Govt Emergency Unit'];
    const baseName = names[Math.floor(Math.random() * names.length)];
    const name = `${baseName} ${idCounter}`;

    const latOffset = (Math.random() - 0.5) * 0.025;
    const lngOffset = (Math.random() - 0.5) * 0.025;
    const location = {
      lat: facility.loc.lat + latOffset,
      lng: facility.loc.lng + lngOffset
    };

    fleet.push({
      id: `veh-${idCounter}`,
      name,
      type,
      status: 'Idle',
      location,
      speed: 0,
      fuel: Math.floor(Math.random() * 40) + 60,
      path: [],
      pathIndex: 0,
      equipment: ['First Aid Kit', 'Emergency Radio', 'Reflective Tapes'],
      crewSize: Math.floor(Math.random() * 3) + 2,
      crewNames: ['Operator A', 'Officer B'],
      etaMinutes: null,
      missionDescription: null
    });
    idCounter++;
  }

  return fleet;
}
