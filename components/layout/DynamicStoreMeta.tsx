'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { usePathname } from 'next/navigation'

/**
 * DynamicStoreMeta
 *
 * Automatically synchronizes document title, meta tags, and JSON-LD schema
 * whenever the admin changes the Store Name or Business Details in settings.
 */
export default function DynamicStoreMeta() {
  const pathname = usePathname()
  const businessName = useSettingsStore((s) => s.businessName)
  const address = useSettingsStore((s) => s.address)
  const phone = useSettingsStore((s) => s.phone)
  const email = useSettingsStore((s) => s.email)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const name = businessName || 'Pizza Expert Prayagraj'

    // 1. Update Document Title dynamically
    const currentTitle = document.title
    if (currentTitle) {
      // If title already has a pipe or dash separator, update the brand portion
      if (currentTitle.includes('|')) {
        const parts = currentTitle.split('|')
        document.title = `${parts[0].trim()} | ${name}`
      } else if (currentTitle.includes('–') || currentTitle.includes('-')) {
        const separator = currentTitle.includes('–') ? '–' : '-'
        const parts = currentTitle.split(separator)
        document.title = `${name} ${separator} ${parts.slice(1).join(separator).trim()}`
      } else {
        document.title = `${name} – Best Wood-Fired Pizzeria`
      }
    } else {
      document.title = `${name} – Best Pizza & Fast Food`
    }

    // 2. Helper to set or update meta tag
    const setMeta = (selector: string, attr: string, value: string, createTag: () => HTMLElement) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = createTag()
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    // Update OpenGraph & App Meta
    setMeta('meta[property="og:site_name"]', 'content', name, () => {
      const m = document.createElement('meta')
      m.setAttribute('property', 'og:site_name')
      return m
    })

    setMeta('meta[name="application-name"]', 'content', name, () => {
      const m = document.createElement('meta')
      m.setAttribute('name', 'application-name')
      return m
    })

    setMeta('meta[name="apple-mobile-web-app-title"]', 'content', name, () => {
      const m = document.createElement('meta')
      m.setAttribute('name', 'apple-mobile-web-app-title')
      return m
    })

    // 3. Dynamic JSON-LD Schema
    let schemaScript = document.getElementById('dynamic-restaurant-schema') as HTMLScriptElement | null
    if (!schemaScript) {
      schemaScript = document.createElement('script')
      schemaScript.id = 'dynamic-restaurant-schema'
      schemaScript.type = 'application/ld+json'
      document.head.appendChild(schemaScript)
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: name,
      telephone: phone || '+91-9999999999',
      email: email || 'hello@pizzaexpert.in',
      address: {
        '@type': 'PostalAddress',
        streetAddress: address || 'Allapur',
        addressLocality: 'Prayagraj',
        addressRegion: 'Uttar Pradesh',
        postalCode: '211006',
        addressCountry: 'IN',
      },
      servesCuisine: ['Pizza', 'Italian', 'Fast Food', 'Burgers'],
      priceRange: '₹₹',
    }

    schemaScript.textContent = JSON.stringify(schemaData)
  }, [businessName, address, phone, email, pathname])

  return null
}
