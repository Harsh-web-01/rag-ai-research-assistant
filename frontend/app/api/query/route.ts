import { NextResponse } from 'next/server';

function apiBase(): string | undefined {
  const raw = process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL;
  return raw?.replace(/\/$/, '');
}

export async function POST(request: Request) {
  const base = apiBase();
  if (!base) {
    return NextResponse.json(
      { error: 'Set NEXT_PUBLIC_API_URL or API_GATEWAY_URL to your API Gateway URL (from Terraform output).' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${base}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Query proxy error:', e);
    return NextResponse.json(
      { error: 'Could not reach the query API. Check NEXT_PUBLIC_API_URL and that the stack is deployed.' },
      { status: 502 }
    );
  }
}
