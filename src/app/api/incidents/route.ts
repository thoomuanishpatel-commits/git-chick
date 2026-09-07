import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Incident, defaultIncidents } from '../../../utils/mockData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'incidents.json');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Upstash Redis / Vercel KV Configuration (Native Vercel Storage)
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_KEY = 'resqai_disaster_incidents';

// In-Memory Global Cache across warm lambda invocations
declare global {
  var __resqai_incidents_memory: Incident[] | undefined;
}

async function getFromRedis(): Promise<Incident[] | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${REDIS_URL}/get/${REDIS_KEY}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.result) {
      const data = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error('[API /api/incidents] Redis read error:', err);
  }
  return null;
}

async function saveToRedis(incidents: Incident[]): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const res = await fetch(`${REDIS_URL}/set/${REDIS_KEY}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(incidents),
      cache: 'no-store'
    });
    return res.ok;
  } catch (err) {
    console.error('[API /api/incidents] Redis write error:', err);
  }
  return false;
}

function getStoragePath(): string {
  // If running in Vercel or AWS Lambda, /tmp is writable; process.cwd() is read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'incidents.json');
  }
  return DATA_FILE;
}

function ensureDataFile(): Incident[] {
  // 1. Check in-memory cache first
  if (globalThis.__resqai_incidents_memory && Array.isArray(globalThis.__resqai_incidents_memory) && globalThis.__resqai_incidents_memory.length > 0) {
    return globalThis.__resqai_incidents_memory;
  }

  const filePath = getStoragePath();

  try {
    // If on Vercel and /tmp/incidents.json doesn't exist yet, seed from build-time DATA_FILE
    if (filePath !== DATA_FILE && !fs.existsSync(filePath)) {
      let seedData = defaultIncidents;
      if (fs.existsSync(DATA_FILE)) {
        try {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            seedData = parsed;
          }
        } catch (e) {}
      }
      try {
        fs.writeFileSync(filePath, JSON.stringify(seedData, null, 2), 'utf-8');
      } catch (e) {}
      globalThis.__resqai_incidents_memory = seedData;
      return seedData;
    }

    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(defaultIncidents, null, 2), 'utf-8');
      globalThis.__resqai_incidents_memory = defaultIncidents;
      return defaultIncidents;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      globalThis.__resqai_incidents_memory = parsed;
      return parsed;
    }
  } catch (err) {
    console.error('[API /api/incidents] Read error:', err);
  }

  globalThis.__resqai_incidents_memory = defaultIncidents;
  return defaultIncidents;
}

function saveDataFile(incidents: Incident[]) {
  // Always update in-memory cache
  globalThis.__resqai_incidents_memory = incidents;

  const filePath = getStoragePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(incidents, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error('[API /api/incidents] Failed to write data file:', err);
  }
}

async function loadIncidents(): Promise<Incident[]> {
  // Check Cloud Redis if configured
  const redisData = await getFromRedis();
  if (redisData && redisData.length > 0) {
    globalThis.__resqai_incidents_memory = redisData;
    return redisData;
  }
  return ensureDataFile();
}

async function saveIncidents(incidents: Incident[]): Promise<void> {
  saveDataFile(incidents);
  // Persist to Cloud Redis if configured
  await saveToRedis(incidents);
}

// GET /api/incidents - Authoritative live incident feed with strictly disabled caching
export async function GET() {
  const incidents = await loadIncidents();
  return NextResponse.json(
    {
      success: true,
      count: incidents.length,
      incidents,
      storage: REDIS_URL ? 'cloud-redis' : process.env.VERCEL ? 'vercel-tmp' : 'local-disk'
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

    const current = await loadIncidents();

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

    await saveIncidents(updated);

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

    const current = await loadIncidents();
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
      await saveIncidents(updated);
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
    await saveIncidents(updated);

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

    const current = await loadIncidents();
    const updated = current.filter(i => i.id !== id);
    await saveIncidents(updated);

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
