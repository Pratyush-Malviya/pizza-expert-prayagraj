import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geocode/search?q=query&city=Prayagraj
 *
 * Search autocomplete for localities, landmarks, and street names in Prayagraj.
 * Supports Google Places / Geocoding if API key is present, with fallback to OpenStreetMap Nominatim.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  const cleanQuery = query.trim()
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // 1. If Google Maps API Key is provided, use Google Places / Geocoding
  if (googleKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery + ', Prayagraj, Uttar Pradesh, India')}&key=${googleKey}`
      const gRes = await fetch(gUrl)
      if (gRes.ok) {
        const gData = await gRes.json()
        if (gData.results && gData.results.length > 0) {
          const formatted = gData.results.slice(0, 6).map((item: any) => ({
            id: item.place_id,
            title: item.formatted_address.split(',')[0] || cleanQuery,
            subtitle: item.formatted_address,
            lat: item.geometry.location.lat,
            lng: item.geometry.location.lng,
            displayName: item.formatted_address,
          }))
          return NextResponse.json({ results: formatted })
        }
      }
    } catch (e) {
      console.warn('Google search failed, falling back to OSM:', e)
    }
  }

  // 2. OpenStreetMap Nominatim Search with Prayagraj bounding bias
  try {
    const osmUrl = new URL('https://nominatim.openstreetmap.org/search')
    osmUrl.searchParams.set('q', `${cleanQuery}, Prayagraj`)
    osmUrl.searchParams.set('format', 'jsonv2')
    osmUrl.searchParams.set('addressdetails', '1')
    osmUrl.searchParams.set('limit', '6')
    osmUrl.searchParams.set('countrycodes', 'in')
    // Prayagraj Viewbox: [left, top, right, bottom]
    osmUrl.searchParams.set('viewbox', '81.65,25.55,82.00,25.30')
    osmUrl.searchParams.set('bounded', '0')

    const response = await fetch(osmUrl.toString(), {
      headers: {
        'User-Agent': 'PizzaExpertPrayagraj/2.0 (contact@pizzaexpert.in)',
        'Accept-Language': 'en',
        Accept: 'application/json',
      },
      next: { revalidate: 120 },
    })

    if (!response.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ results: [] })
    }

    const results = data.map((item: any) => {
      const parts = (item.display_name || '').split(',').map((s: string) => s.trim())
      return {
        id: item.place_id ? String(item.place_id) : Math.random().toString(),
        title: item.name || parts[0] || cleanQuery,
        subtitle: parts.slice(0, 4).join(', '),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
      }
    })

    return NextResponse.json({ results })
  } catch (err: any) {
    console.error('[geocode/search] search failed:', err)
    return NextResponse.json({ results: [] })
  }
}
