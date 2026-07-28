import { NextResponse } from 'next/server';

// Liveness probe for the Docker HEALTHCHECK / orchestrators — reports only
// that the Next.js server is up and serving requests. Deliberately doesn't
// touch MongoDB: a transient DB blip shouldn't make the container restart.
export async function GET() {
  return NextResponse.json({ status: 'ok', uptime: process.uptime() });
}
