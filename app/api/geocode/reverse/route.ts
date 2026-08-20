import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geocode/reverse?lat=xx&lng=xx
 *
 * Server-side proxy for OpenStreetMap Nominatim reverse geocoding.
 * Runs on the server to avoid CORS issues with direct browser requests.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'lat and lng query params are required' },
      { status: 400 }
    )
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json(
      { error: 'lat and lng must be valid numbers' },
      { status: 400 }
    )
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', latNum.toString())
    url.searchParams.set('lon', lngNum.toString())
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('zoom', '18')

    const response = await fetch(url.toString(), {
      headers: {
        // Required by Nominatim usage policy — runs server-side so no CORS issues
        'User-Agent': 'PizzaExpertPrayagraj/1.0 (contact@pizzaexpert.in)',
        'Accept-Language': 'en',
        Accept: 'application/json',
      },
      // Cache for 60s at the CDN/Next.js level (same coords = same result)
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Nominatim returned ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 404 })
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err: any) {
    console.error('[geocode/reverse] fetch failed:', err)
    return NextResponse.json(
      { error: 'Failed to reach geocoding service. Please try again.' },
      { status: 503 }
    )
  }
}
