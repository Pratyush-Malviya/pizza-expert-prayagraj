import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { createClient } from '@/lib/supabase/client'

export interface MediaImage {
  id: string
  url: string
  title: string
  category: 'pizzas' | 'burgers' | 'pasta' | 'sides' | 'beverages' | 'combos' | 'general' | 'uploads'
  source: 'database' | 'uploaded' | 'stock'
  addedAt?: string
}

const UPLOADS_STORAGE_KEY = 'pizza_uploaded_images_history'

// Categorize known food image keys or titles
export function categorizeImage(titleOrKey: string): MediaImage['category'] {
  const lower = titleOrKey.toLowerCase()
  if (lower.includes('pizza') || lower.includes('margherita') || lower.includes('farm-house') || lower.includes('paneer-tikka')) return 'pizzas'
  if (lower.includes('burger') || lower.includes('patty') || lower.includes('zinger')) return 'burgers'
  if (lower.includes('pasta') || lower.includes('penne') || lower.includes('alfredo') || lower.includes('arrabiata')) return 'pasta'
  if (lower.includes('bread') || lower.includes('fries') || lower.includes('side') || lower.includes('garlic')) return 'sides'
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('cola') || lower.includes('lassi') || lower.includes('shake')) return 'beverages'
  if (lower.includes('combo') || lower.includes('feast') || lower.includes('meal')) return 'combos'
  return 'general'
}

// Convert a slug to clean display name
function formatSlugTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function fetchAllMediaImages(): Promise<MediaImage[]> {
  const results: MediaImage[] = []
  const seenUrls = new Set<string>()

  const addImage = (img: MediaImage) => {
    if (!img.url || typeof img.url !== 'string' || img.url.trim() === '') return
    const cleanUrl = img.url.trim()
    if (seenUrls.has(cleanUrl)) return
    seenUrls.add(cleanUrl)
    results.push({ ...img, url: cleanUrl })
  }

  // 1. Previously uploaded images from LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const storedUploadsRaw = localStorage.getItem(UPLOADS_STORAGE_KEY)
      if (storedUploadsRaw) {
        const storedUploads: Array<{ id: string; url: string; title: string; addedAt?: string }> = JSON.parse(storedUploadsRaw)
        if (Array.isArray(storedUploads)) {
          storedUploads.forEach((item, index) => {
            addImage({
              id: item.id || `upload-${index}`,
              url: item.url,
              title: item.title || `Uploaded Image ${index + 1}`,
              category: 'uploads',
              source: 'uploaded',
              addedAt: item.addedAt,
            })
          })
        }
      }
    } catch (err) {
      console.warn('Failed to parse uploaded images from localStorage', err)
    }
  }

  // 2. Fetch from Supabase tables (products, categories, offers, settings)
  try {
    const supabase = createClient()

    // Remote products
    const { data: remoteProducts } = await supabase
      .from('products')
      .select('id, name, slug, image_url')
      .limit(100)

    if (remoteProducts && Array.isArray(remoteProducts)) {
      remoteProducts.forEach((prod) => {
        if (prod.image_url) {
          addImage({
            id: `db-prod-${prod.id}`,
            url: prod.image_url,
            title: prod.name || formatSlugTitle(prod.slug || 'Product'),
            category: categorizeImage(prod.name || prod.slug || ''),
            source: 'database',
          })
        }
      })
    }

    // Remote categories
    const { data: remoteCategories } = await supabase
      .from('categories')
      .select('id, name, slug, image_url')
      .limit(50)

    if (remoteCategories && Array.isArray(remoteCategories)) {
      remoteCategories.forEach((cat) => {
        if (cat.image_url) {
          addImage({
            id: `db-cat-${cat.id}`,
            url: cat.image_url,
            title: `${cat.name} (Category)`,
            category: categorizeImage(cat.name || cat.slug || ''),
            source: 'database',
          })
        }
      })
    }

    // Remote offers
    const { data: remoteOffers } = await supabase
      .from('offers')
      .select('id, title, image_url')
      .limit(50)

    if (remoteOffers && Array.isArray(remoteOffers)) {
      remoteOffers.forEach((offer) => {
        if (offer.image_url) {
          addImage({
            id: `db-offer-${offer.id}`,
            url: offer.image_url,
            title: `${offer.title} (Offer)`,
            category: 'general',
            source: 'database',
          })
        }
      })
    }
  } catch (err) {
    console.warn('Supabase media fetch fallback:', err)
  }

  // 3. Check LocalStorage caches for products, categories, offers
  if (typeof window !== 'undefined') {
    try {
      const storedProdsRaw = localStorage.getItem('pizza_products')
      if (storedProdsRaw) {
        const storedProds = JSON.parse(storedProdsRaw)
        if (Array.isArray(storedProds)) {
          storedProds.forEach((prod) => {
            if (prod.image_url) {
              addImage({
                id: `local-prod-${prod.id || prod.slug}`,
                url: prod.image_url,
                title: prod.name || formatSlugTitle(prod.slug || 'Product'),
                category: categorizeImage(prod.name || prod.slug || ''),
                source: prod.image_url.startsWith('data:') ? 'uploaded' : 'database',
              })
            }
          })
        }
      }

      const storedCatsRaw = localStorage.getItem('pizza_categories')
      if (storedCatsRaw) {
        const storedCats = JSON.parse(storedCatsRaw)
        if (Array.isArray(storedCats)) {
          storedCats.forEach((cat) => {
            if (cat.image_url) {
              addImage({
                id: `local-cat-${cat.id || cat.slug}`,
                url: cat.image_url,
                title: `${cat.name} (Category)`,
                category: categorizeImage(cat.name || cat.slug || ''),
                source: cat.image_url.startsWith('data:') ? 'uploaded' : 'database',
              })
            }
          })
        }
      }

      const storedOffersRaw = localStorage.getItem('pizza_offers')
      if (storedOffersRaw) {
        const storedOffers = JSON.parse(storedOffersRaw)
        if (Array.isArray(storedOffers)) {
          storedOffers.forEach((offer) => {
            const imgUrl = offer.imageUrl || offer.image_url
            if (imgUrl) {
              addImage({
                id: `local-offer-${offer.id || offer.code}`,
                url: imgUrl,
                title: `${offer.title || offer.code} (Offer)`,
                category: 'general',
                source: imgUrl.startsWith('data:') ? 'uploaded' : 'database',
              })
            }
          })
        }
      }
    } catch (err) {
      console.warn('Error reading local cache media items:', err)
    }
  }

  // 4. Built-in curated Stock Food Library (FOOD_IMAGES)
  Object.entries(FOOD_IMAGES).forEach(([key, url]) => {
    addImage({
      id: `stock-${key}`,
      url,
      title: formatSlugTitle(key),
      category: categorizeImage(key),
      source: 'stock',
    })
  })

  return results
}

export function saveUploadedImageToHistory(url: string, title?: string): void {
  if (typeof window === 'undefined' || !url) return

  try {
    const raw = localStorage.getItem(UPLOADS_STORAGE_KEY)
    let list: Array<{ id: string; url: string; title: string; addedAt?: string }> = []
    if (raw) {
      list = JSON.parse(raw)
      if (!Array.isArray(list)) list = []
    }

    // Filter out if duplicate URL exists already
    list = list.filter((item) => item.url !== url)

    // Add to front of list
    list.unshift({
      id: `upload-${Date.now()}`,
      url,
      title: title || `Upload ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      addedAt: new Date().toISOString(),
    })

    // Keep up to 60 most recent uploads
    if (list.length > 60) {
      list = list.slice(0, 60)
    }

    localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save uploaded image to history', err)
  }
}
