import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    // Resolve relative paths against the app origin
    const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const absolute = url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? '' : '/'}${url}`;

    const resp = await fetch(absolute);
    if (!resp.ok) return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });

    const buffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
