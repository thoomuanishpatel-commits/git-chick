import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Incident, defaultIncidents } from '../../../utils/mockData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'incidents.json');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(incidents, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('[API /api/incidents] Failed to write data file:', err);
  }
}

// GET /api/incidents - Authoritative live incident feed with strictly disabled caching
export async function GET() {
  const incidents = ensureDataFile();
  return NextResponse.json(
    {
      success: true,
      count: incidents.length,
      incidents
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    }
  );
}

// POST /api/incidents - Ingests new emergency reports from any device
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
      requiredResources: Array.isArray(body.requiredResources) && body.requiredResources.length > 0
        ? body.requiredResources
        : ['First Responder Unit'],
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
      // Prepend user-reported incident so it's prioritized at top of all portals
      updated = [newIncident, ...current];
    }

    saveDataFile(updated);

    return NextResponse.json({
      success: true,
      incident: newIncident,
      count: updated.length,
      incidents: updated
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('[API POST /api/incidents] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/incidents - Real-time sync for dispatch status, resolution, and vehicle assignment
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
        requiredResources: Array.isArray(body.requiredResources) && body.requiredResources.length > 0
          ? body.requiredResources
          : ['First Responder Unit'],
        isUserReported: body.isUserReported ?? true,
        starred: body.starred ?? true
      };
      const updated = [newInc, ...current];
      saveDataFile(updated);
      return NextResponse.json({ success: true, incident: newInc, count: updated.length, incidents: updated });
    }

    // Preserve isUserReported and starred if previously flagged
    const merged: Incident = {
      ...current[index],
      ...body,
      requiredResources: Array.isArray(body.requiredResources || current[index].requiredResources)
        ? (body.requiredResources || current[index].requiredResources)
        : ['First Responder Unit'],
      isUserReported: current[index].isUserReported || body.isUserReported || false,
      starred: current[index].starred || body.starred || false
    };

    const updated = [...current];
    updated[index] = merged;
    saveDataFile(updated);

    return NextResponse.json({
      success: true,
      incident: merged,
      count: updated.length,
      incidents: updated
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('[API PATCH /api/incidents] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/incidents - Archive or purge incident
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing incident ID' }, { status: 400 });
    }

    const current = ensureDataFile();
    const updated = current.filter(i => i.id !== id);
    saveDataFile(updated);

    return NextResponse.json({
      success: true,
      count: updated.length,
      incidents: updated
    });
  } catch (err: any) {
    console.error('[API DELETE /api/incidents] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
