import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get country code from Cloudflare header
  const countryCode = request.headers.get('cf-ipcountry') || null;

  return NextResponse.json(
    { countryCode },
    {
      headers: {
        // Short cache - visitor info shouldn't be cached long
        'Cache-Control': 'private, max-age=60',
      },
    }
  );
}
