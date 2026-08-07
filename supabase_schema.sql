-- TSDMA ResQAI Platform Database Schema Setup
-- Run this in your Supabase project SQL Editor to create the necessary tables.

-- 1. Create Vehicles (Fleet Telemetry) Table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id text PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'Idle',
    location jsonb NOT NULL, -- Format: {"lat": 17.123, "lng": 78.456}
    speed numeric DEFAULT 0,
    fuel numeric DEFAULT 100,
    "activeIncidentId" text, -- Reference ID
    path jsonb DEFAULT '[]'::jsonb, -- Array of coordinate nodes
    "pathIndex" numeric DEFAULT 0,
    equipment jsonb DEFAULT '[]'::jsonb,
    "crewSize" numeric DEFAULT 2,
    "crewNames" jsonb DEFAULT '[]'::jsonb,
    "etaMinutes" numeric DEFAULT NULL,
    "missionDescription" text DEFAULT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Incidents (Distress Tickets) Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id text PRIMARY KEY,
    type text NOT NULL,
    category text NOT NULL,
    severity numeric DEFAULT 50,
    status text NOT NULL DEFAULT 'Pending',
    location jsonb NOT NULL, -- Format: {"lat": 17.123, "lng": 78.456}
    description text NOT NULL,
    "casualtyEstimate" numeric DEFAULT 0,
    "trappedCount" numeric DEFAULT 0,
    "requiredResources" jsonb DEFAULT '[]'::jsonb, -- Array of strings
    "reportedAt" text NOT NULL,
    reporter text NOT NULL,
    "aiPriority" text DEFAULT 'MEDIUM',
    "etaResolution" numeric DEFAULT 2.0,
    "assignedVehicleId" text REFERENCES public.vehicles(id) ON DELETE SET NULL,
    "needsSOSValidation" boolean DEFAULT true,
    "snakeDetails" jsonb DEFAULT NULL,
    "animalRescueDetails" jsonb DEFAULT NULL,
    "civicDetails" jsonb DEFAULT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Shelters (Relief Centers) Table
CREATE TABLE IF NOT EXISTS public.shelters (
    id text PRIMARY KEY,
    name text NOT NULL,
    location jsonb NOT NULL,
    capacity numeric DEFAULT 1000,
    occupied numeric DEFAULT 0,
    "waterSupply" numeric DEFAULT 100,
    "foodSupply" numeric DEFAULT 100,
    "medicalSupply" numeric DEFAULT 100,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) or public access for demo purposes:
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;

-- Create public access policies so the frontend can read/write directly (for testing/demo convenience)
CREATE POLICY "Allow public read access on incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on incidents" ON public.incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on incidents" ON public.incidents FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on vehicles" ON public.vehicles FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on shelters" ON public.shelters FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on shelters" ON public.shelters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on shelters" ON public.shelters FOR UPDATE USING (true);

-- Insert Initial Mock Shelters
INSERT INTO public.shelters (id, name, location, capacity, occupied, "waterSupply", "foodSupply", "medicalSupply")
VALUES 
('shlt-1', 'Gachibowli Indoor Stadium Camp', '{"lat": 17.4452, "lng": 78.3440}'::jsonb, 2000, 650, 85, 78, 65),
('shlt-2', 'Warangal Regional Sports Complex Shelter', '{"lat": 17.9700, "lng": 79.6000}'::jsonb, 1000, 280, 90, 88, 92),
('shlt-3', 'Nalgonda Govt Junior College relief camp', '{"lat": 17.0600, "lng": 79.2600}'::jsonb, 800, 760, 38, 40, 25)
ON CONFLICT (id) DO UPDATE SET
    occupied = EXCLUDED.occupied,
    "waterSupply" = EXCLUDED."waterSupply",
    "foodSupply" = EXCLUDED."foodSupply",
    "medicalSupply" = EXCLUDED."medicalSupply";
