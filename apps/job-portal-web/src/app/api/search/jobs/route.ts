import { NextResponse } from 'next/server';

/**
 * Server-side proxy to `search-gateway`. Tenant id is taken from env for local demos;
 * replace with session-derived tenant before production traffic.
 */
export async function POST(req: Request) {
  const base = process.env.SEARCH_GATEWAY_URL;
  if (!base) {
    return NextResponse.json({ error: 'search_gateway_unconfigured' }, { status: 503 });
  }
  const tenant = process.env.PORTAL_SEARCH_TENANT_ID ?? '11111111-1111-1111-1111-111111111111';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const url = `${base.replace(/\/$/, '')}/v1/search/jobs`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jobocate-Tenant-Id': tenant,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
