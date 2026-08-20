import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geocode/reverse?lat=xx&lng=xx
 *
 * High-accuracy reverse geocoding combining OpenStreetMap Nominatim (jsonv2)
 * and BigDataCloud reverse geocode client for pinpoint street, locality,
 * landmark, and PIN code extraction in Prayagraj & India.
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
    // 1. Fetch OpenStreetMap Nominatim with jsonv2 & addressdetails
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse')
    nominatimUrl.searchParams.set('lat', latNum.toString())
    nominatimUrl.searchParams.set('lon', lngNum.toString())
    nominatimUrl.searchParams.set('format', 'jsonv2')
    nominatimUrl.searchParams.set('addressdetails', '1')
    nominatimUrl.searchParams.set('namedetails', '1')
    nominatimUrl.searchParams.set('extratags', '1')
    nominatimUrl.searchParams.set('zoom', '18')

    // 2. Fetch BigDataCloud in parallel for granular Indian locality & street mapping
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

    // ── Extract Pincode ──
    let pincode = addr.postcode || bdcData?.postcode || ''
    if (!pincode && displayName) {
      const pinMatch = displayName.match(/\b([1-9][0-9]{5})\b/)
      if (pinMatch) pincode = pinMatch[1]
    }
    if (!pincode) pincode = '211006'

    // ── Extract City & State ──
    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.city_district ||
      bdcData?.city ||
      bdcData?.locality ||
      'Prayagraj'

    const state = addr.state || bdcData?.principalSubdivision || 'Uttar Pradesh'

    // ── Extract Specific Street / Road / Building (Line 1) ──
    const streetParts: string[] = []

    // House / Flat
    if (addr.house_number) streetParts.push(addr.house_number)

    // Building / Shop / Amenity / Landmark
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

    // Road / Street / Lane / Marg
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

    // If still empty, check BigDataCloud informative array for streets / avenues / marg
    if (streetParts.length === 0 && bdcData?.localityInfo?.informative) {
      const bdcStreets = bdcData.localityInfo.informative
        .filter((i: any) => i.order >= 4 && i.name && !i.name.includes('District') && !i.name.includes('Division'))
        .map((i: any) => i.name)
      if (bdcStreets.length > 0) {
        streetParts.push(bdcStreets[0])
      }
    }

    // Fallback from Nominatim Display Name segments
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

    // ── Extract Locality / Suburb / Colony / Sector (Line 2) ──
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

    // If line1 is still missing, build an informative local street description
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
