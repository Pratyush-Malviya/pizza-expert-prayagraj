'use client'

import { useState, useCallback, useEffect } from 'react'

export type GeolocationPermission = 'prompt' | 'granted' | 'denied' | 'unsupported'

export interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
  permissionState: GeolocationPermission
}

/**
 * useGeolocation — React hook that wraps browser navigator.geolocation
 * 
 * Returns:
 *  - lat, lng, accuracy  → current position (null until granted)
 *  - error               → human-readable error message
 *  - loading             → true while fetching position
 *  - permissionState     → 'prompt' | 'granted' | 'denied' | 'unsupported'
 *  - requestLocation()   → manual trigger function
 *  - clearLocation()     → reset state
 */
export function useGeolocation(autoRequest = false) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: false,
    permissionState: 'prompt',
  })

  // Check if geolocation is supported and query permission state
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!navigator.geolocation) {
      setState((s) => ({ ...s, permissionState: 'unsupported' }))
      return
    }

    // Query current permission state (non-blocking)
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setState((s) => ({ ...s, permissionState: result.state as GeolocationPermission }))

          // Watch for future changes (user may toggle in browser settings)
          result.onchange = () => {
            setState((s) => ({ ...s, permissionState: result.state as GeolocationPermission }))
          }
        })
        .catch(() => {
          // permissions API not available — keep 'prompt'
        })
    }
  }, [])

  // Auto-request on mount if requested (e.g., on checkout page)
  useEffect(() => {
    if (autoRequest && state.permissionState === 'granted') {
      requestLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest, state.permissionState])

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: 'Geolocation is not supported by your browser.',
        permissionState: 'unsupported',
      }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          permissionState: 'granted',
        })
      },
      (err) => {
        let message = 'Unable to retrieve your location.'
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location permission denied. Please allow location access in your browser settings.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable. Please check your GPS/Wi-Fi.'
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out. Please try again.'
        }
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
          permissionState: err.code === err.PERMISSION_DENIED ? 'denied' : s.permissionState,
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // cache for 60 seconds
      }
    )
  }, [])

  const clearLocation = useCallback(() => {
    setState((s) => ({
      ...s,
      lat: null,
      lng: null,
      accuracy: null,
      error: null,
      loading: false,
    }))
  }, [])

  return {
    ...state,
    requestLocation,
    clearLocation,
  }
}
