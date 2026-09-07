import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Incident, defaultIncidents } from '../../../utils/mockData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'incidents.json');

function ensureDataFile(): Incident[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
      // Seed with initial mock incidents
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultIncidents, null, 2), 'utf-8');
      return defaultIncidents;
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return defaultIncidents;
  } catch (err) {
    console.error('[API /api/incidents] Failed to read data file:', err);
    return defaultIncidents;
  }
}

function saveDataFile(incidents: Incident[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(incidents, null, 2), 'utf-8');
  } catch (err) {
    console.error('[API /api/incidents] Failed to write data file:', err);
  }
}

// GET /api/incidents
export async function GET() {
  const incidents = ensureDataFile();
  return NextResponse.json({
    success: true,
    count: incidents.length,
    incidents
  });
}

// POST /api/incidents
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.type || !body.location) {
      return NextResponse.json({ success: false, error: 'Invalid incident payload' }, { status: 400 });
    }

    const current = ensureDataFile();

    const newIncident: Incident = {
      ...body,
      id: body.id || `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      reportedAt: body.reportedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: body.status || 'Active',
      isUserReported: true,
      starred: true
    };

    // Check if duplicate ID exists
    const existingIndex = current.findIndex(i => i.id === newIncident.id);
    let updated: Incident[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...newIncident };
    } else {
      // Prepend user-reported incident so it's prioritized at top
      updated = [newIncident, ...current];
    }

    saveDataFile(updated);

    return NextResponse.json({
      success: true,
      incident: newIncident,
      count: updated.length
    });
  } catch (err: any) {
    console.error('[API POST /api/incidents] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/incidents
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.id) {
      return NextResponse.json({ success: false, error: 'Missing incident ID' }, { status: 400 });
    }

    const current = ensureDataFile();
    const index = current.findIndex(i => i.id === body.id);

    if (index === -1) {
      // If it doesn't exist, insert it
      const newInc: Incident = {
        ...body,
        isUserReported: body.isUserReported ?? true,
        starred: body.starred ?? true
      };
      const updated = [newInc, ...current];
      saveDataFile(updated);
      return NextResponse.json({ success: true, incident: newInc });
    }

    // Preserve isUserReported and starred if previously flagged
    const merged: Incident = {
      ...current[index],
      ...body,
      isUserReported: current[index].isUserReported || body.isUserReported || false,
      starred: current[index].starred || body.starred || false
    };

    const updated = [...current];
    updated[index] = merged;
    saveDataFile(updated);

    return NextResponse.json({
      success: true,
      incident: merged
    });
  } catch (err: any) {
    console.error('[API PATCH /api/incidents] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
