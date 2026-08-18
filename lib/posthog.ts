import posthog from 'posthog-js'

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

/**
 * Initialize PostHog client safely on the browser
 */
export function initPostHog() {
  if (typeof window === 'undefined') return

  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // captured manually with Next.js router
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          // Optional dev mode debug flag
          // ph.debug()
        }
      },
    })
  }
}

/**
 * Track custom events
 */
export function trackPostHogEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    if (POSTHOG_KEY && posthog.__loaded) {
      posthog.capture(eventName, properties)
    }

    // Also store in local telemetry cache so admin analytics can visualize live events even during local testing
    storeLocalTelemetryEvent(eventName, properties)
  } catch (err) {
    console.debug('[PostHog] Event track note:', err)
  }
}

/**
 * Identify authenticated user with distinct properties
 */
export function identifyPostHogUser(
  distinctId: string,
  properties?: {
    email?: string
    name?: string
    phone?: string
    role?: string
    total_orders?: number
    [key: string]: any
  }
) {
  if (typeof window === 'undefined') return

  try {
    if (POSTHOG_KEY && posthog.__loaded) {
      posthog.identify(distinctId, properties)
    }
  } catch (err) {
    console.debug('[PostHog] Identify note:', err)
  }
}

/**
 * Reset user identity on sign out
 */
export function resetPostHogUser() {
  if (typeof window === 'undefined') return

  try {
    if (POSTHOG_KEY && posthog.__loaded) {
      posthog.reset()
    }
  } catch (err) {
    console.debug('[PostHog] Reset note:', err)
  }
}

/**
 * Local telemetry stream buffer for in-app admin dashboard viewing
 */
const TELEMETRY_STORAGE_KEY = 'pizza_expert_telemetry_events'

export interface TelemetryEvent {
  id: string
  event: string
  properties: Record<string, any>
  timestamp: string
  distinctId?: string
}

function storeLocalTelemetryEvent(event: string, properties?: Record<string, any>) {
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY)
    const existing: TelemetryEvent[] = raw ? JSON.parse(raw) : []
    
    const newEntry: TelemetryEvent = {
      id: Math.random().toString(36).substring(2, 9),
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      distinctId: posthog.__loaded ? posthog.get_distinct_id() : 'anon_' + (properties?.userId || 'guest'),
    }

    const updated = [newEntry, ...existing.slice(0, 99)]
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export function getLocalTelemetryEvents(): TelemetryEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export { posthog }
