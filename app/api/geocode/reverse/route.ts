import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geocode/reverse?lat=xx&lng=xx
 *
 * Multi-provider reverse geocoding:
 * 1. Google Maps Geocoding API (if API Key is configured)
 * 2. High-precision OpenStreetMap Nominatim (jsonv2) + BigDataCloud (in parallel)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const paramGoogleKey = searchParams.get('googleKey')

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

  const googleKey = paramGoogleKey || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // 1. Try Google Maps Geocoding API if key is available
  if (googleKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latNum},${lngNum}&key=${googleKey}`
      const gRes = await fetch(gUrl)
      if (gRes.ok) {
        const gData = await gRes.json()
        if (gData.results && gData.results.length > 0) {
          const topResult = gData.results[0]
          const comps = topResult.address_components || []

          const getComp = (types: string[]) => {
            const c = comps.find((comp: any) => types.some((t) => comp.types.includes(t)))
            return c ? c.long_name : ''
          }

          const premise = getComp(['premise', 'subpremise', 'point_of_interest', 'establishment'])
          const route = getComp(['route', 'street_address'])
          const subloc2 = getComp(['sublocality_level_2', 'neighborhood'])
          const subloc1 = getComp(['sublocality_level_1', 'sublocality'])
          const city = getComp(['locality', 'administrative_area_level_2']) || 'Prayagraj'
          const state = getComp(['administrative_area_level_1']) || 'Uttar Pradesh'
          const pincode = getComp(['postal_code']) || '211006'

          const line1Parts = [premise, route].filter(Boolean)
          const line2Parts = [subloc2, subloc1].filter(Boolean)

          const line1 = line1Parts.join(', ') || (topResult.formatted_address.split(',')[0] || 'Local Street')
          const line2 = line2Parts.join(', ') || (line1Parts.length > 0 ? subloc1 : 'Prayagraj')

          return NextResponse.json({
            line1,
            line2,
            city,
            state,
            pincode,
            country: 'India',
            displayName: topResult.formatted_address,
            landmark: premise || undefined,
            provider: 'google',
            raw: topResult,
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
          })
        }
      }
    } catch (err) {
      console.warn('Google reverse geocode failed, falling back to OSM + BDC:', err)
    }
  }

  // 2. Dual-provider: OpenStreetMap Nominatim + BigDataCloud
  try {
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse')
    nominatimUrl.searchParams.set('lat', latNum.toString())
    nominatimUrl.searchParams.set('lon', lngNum.toString())
    nominatimUrl.searchParams.set('format', 'jsonv2')
    nominatimUrl.searchParams.set('addressdetails', '1')
    nominatimUrl.searchParams.set('namedetails', '1')
    nominatimUrl.searchParams.set('extratags', '1')
    nominatimUrl.searchParams.set('zoom', '18')

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latNum}&longitude=${lngNum}&localityLanguage=en`

    const [nominatimRes, bdcRes] = await Promise.allSettled([
      fetch(nominatimUrl.toString(), {
        headers: {
          'User-Agent': 'PizzaExpertPrayagraj/2.0 (contact@pizzaexpert.in)',
          'Accept-Language': 'en',
          Accept: 'application/json',
        },
        next: { revalidate: 60 },
      }),
      fetch(bdcUrl, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
    ])

    let nomData: any = null
    let bdcData: any = null

    if (nominatimRes.status === 'fulfilled' && nominatimRes.value.ok) {
      nomData = await nominatimRes.value.json().catch(() => null)
    }

    if (bdcRes.status === 'fulfilled' && bdcRes.value.ok) {
      bdcData = await bdcRes.value.json().catch(() => null)
    }

    const addr = nomData?.address || {}
    const displayName: string = nomData?.display_name || ''

    let pincode = addr.postcode || bdcData?.postcode || ''
    if (!pincode && displayName) {
      const pinMatch = displayName.match(/\b([1-9][0-9]{5})\b/)
      if (pinMatch) pincode = pinMatch[1]
    }
    if (!pincode) pincode = '211006'

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.city_district ||
      bdcData?.city ||
      bdcData?.locality ||
      'Prayagraj'

    const state = addr.state || bdcData?.principalSubdivision || 'Uttar Pradesh'

    const streetParts: string[] = []
    if (addr.house_number) streetParts.push(addr.house_number)

    const buildingName =
      addr.building ||
      addr.amenity ||
      addr.shop ||
      addr.office ||
      addr.tourism ||
      addr.leisure ||
      addr.historic ||
      nomData?.name ||
      ''

    if (buildingName && buildingName.toLowerCase() !== city.toLowerCase()) {
      streetParts.push(buildingName)
    }

    const roadName =
      addr.road ||
      addr.street ||
      addr.pedestrian ||
      addr.path ||
      addr.footway ||
      addr.neighbourhood_road ||
      ''

    if (roadName && !streetParts.some((p) => p.toLowerCase().includes(roadName.toLowerCase()))) {
      streetParts.push(roadName)
    }

    if (streetParts.length === 0 && bdcData?.localityInfo?.informative) {
      const bdcStreets = bdcData.localityInfo.informative
        .filter((i: any) => i.order >= 4 && i.name && !i.name.includes('District') && !i.name.includes('Division'))
        .map((i: any) => i.name)
      if (bdcStreets.length > 0) {
        streetParts.push(bdcStreets[0])
      }
    }

    if (streetParts.length === 0 && displayName) {
      const rawSegments = displayName.split(',').map((s) => s.trim()).filter(Boolean)
      const filtered = rawSegments.filter((seg) => {
        const lower = seg.toLowerCase()
        return (
          lower !== 'india' &&
          lower !== state.toLowerCase() &&
          lower !== city.toLowerCase() &&
          lower !== 'allahabad district' &&
          lower !== 'prayagraj district' &&
          !seg.match(/^\d{6}$/)
        )
      })
      if (filtered.length > 0) {
        streetParts.push(filtered.slice(0, Math.min(2, filtered.length)).join(', '))
      }
    }

    const localityParts: string[] = []
    const locCandidates = [
      addr.neighbourhood,
      addr.suburb,
      addr.residential,
      addr.quarter,
      addr.locality,
      addr.hamlet,
      addr.village,
      addr.city_district,
      bdcData?.locality,
    ].filter(Boolean)

    for (const cand of locCandidates) {
      if (
        cand &&
        !localityParts.some((p) => p.toLowerCase() === cand.toLowerCase()) &&
        !streetParts.some((p) => p.toLowerCase() === cand.toLowerCase()) &&
        cand.toLowerCase() !== city.toLowerCase()
      ) {
        localityParts.push(cand)
      }
    }

    let line1 = streetParts.filter(Boolean).join(', ')
    let line2 = localityParts.slice(0, 2).join(', ')

    if (!line1) {
      line1 = line2 ? `Near ${line2}` : (nomData?.name || 'Local Street')
    }

    if (!line2) {
      line2 = bdcData?.locality || 'Prayagraj'
    }

    const landmark = buildingName || addr.amenity || ''

    const result = {
      line1,
      line2,
      city,
      state,
      pincode,
      country: addr.country || 'India',
      displayName: displayName || `${line1}, ${line2}, ${city}, ${state} ${pincode}`,
      landmark: landmark || undefined,
      provider: 'osm+bdc',
      address: addr,
      raw: nomData || bdcData,
    }

    return NextResponse.json(result, {
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
