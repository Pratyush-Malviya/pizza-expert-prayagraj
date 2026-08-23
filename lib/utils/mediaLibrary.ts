import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { createClient } from '@/lib/supabase/client'
import { idbGet, idbSet, idbDelete, safeLocalStorage } from '@/lib/utils/safeStorage'

export interface MediaImage {
  id: string
  url: string
  title: string
  alt: string
  category: 'pizzas' | 'burgers' | 'pasta' | 'sides' | 'beverages' | 'combos' | 'general' | 'uploads'
  source: 'database' | 'uploaded' | 'stock'
  addedAt?: string
}

const IDB_UPLOADS_KEY = 'pizza_uploaded_images_history'
const METADATA_STORAGE_KEY = 'pizza_media_metadata_v2'
const DELETED_STORAGE_KEY = 'pizza_deleted_media_urls'

// Helper to make a short safe key for metadata (avoids 2MB base64 keys)
function getSafeMetaKey(url: string): string {
  if (!url) return ''
  if (!url.startsWith('data:')) return url
  // For data URLs, create a lightweight signature:
  let hash = 0
  for (let i = 0; i < Math.min(url.length, 300); i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i)
    hash |= 0
  }
  return `data_img_${Math.abs(hash)}_${url.length}`
}

// Categorize known food image keys or titles
export function categorizeImage(titleOrKey: string): MediaImage['category'] {
  const lower = (titleOrKey || '').toLowerCase()
  if (lower.includes('pizza') || lower.includes('margherita') || lower.includes('farm-house') || lower.includes('paneer-tikka')) return 'pizzas'
  if (lower.includes('burger') || lower.includes('patty') || lower.includes('zinger')) return 'burgers'
  if (lower.includes('pasta') || lower.includes('penne') || lower.includes('alfredo') || lower.includes('arrabiata')) return 'pasta'
  if (lower.includes('bread') || lower.includes('fries') || lower.includes('side') || lower.includes('garlic')) return 'sides'
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('cola') || lower.includes('lassi') || lower.includes('shake')) return 'beverages'
  if (lower.includes('combo') || lower.includes('feast') || lower.includes('meal')) return 'combos'
  return 'general'
}

// Convert a slug to clean display name
export function formatSlugTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper to safely compress data URL images to compact sizes (max 400-800px, 20-40KB)
export function compressImageDataUrl(dataUrl: string, maxDim: number = 600, quality: number = 0.85): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl)
      return
    }
    // If it's already tiny (< 60KB), return as is
    if (dataUrl.length < 60000) {
      resolve(dataUrl)
      return
    }

    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxDim && height <= maxDim && dataUrl.length < 80000) {
        resolve(dataUrl)
        return
      }
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      const isPng = dataUrl.startsWith('data:image/png')
      const mime = isPng ? 'image/png' : 'image/jpeg'
      const compressed = canvas.toDataURL(mime, quality)
      resolve(compressed)
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

// Get metadata dictionary
export function getAllMediaMetadata(): Record<string, { alt?: string; title?: string }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = safeLocalStorage.getItem(METADATA_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Save or update alt text & metadata for an image without quota errors
export function updateImageMetadata(url: string, data: { alt?: string; title?: string }): void {
  if (typeof window === 'undefined' || !url) return
  try {
    const metaKey = getSafeMetaKey(url)
    const meta = getAllMediaMetadata()
    meta[metaKey] = {
      ...(meta[metaKey] || {}),
      ...data,
    }
    safeLocalStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(meta))
  } catch (err) {
    console.warn('Could not update image metadata', err)
  }
}

// Get deleted URLs set
export function getDeletedImageUrls(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = safeLocalStorage.getItem(DELETED_STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      return new Set(Array.isArray(arr) ? arr : [])
    }
  } catch {}
  return new Set()
}

// Delete one or multiple images
export async function deleteMediaImages(urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !urls || urls.length === 0) return

  const urlSet = new Set(urls)

  // 1. Remove from IndexedDB
  try {
    const currentUploads = (await idbGet<Array<{ id: string; url: string; title: string }>>(IDB_UPLOADS_KEY)) || []
    const updated = currentUploads.filter((item) => !urlSet.has(item.url))
    await idbSet(IDB_UPLOADS_KEY, updated)
  } catch (err) {
    console.warn('Error removing from IDB uploads history', err)
  }

  // 2. Add to deleted URLs list
  try {
    const deletedSet = getDeletedImageUrls()
    urls.forEach((u) => deletedSet.add(u))
    safeLocalStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)))
  } catch (err) {
    console.warn('Error saving deleted image urls', err)
  }

  // 3. Clean up metadata
  try {
    const meta = getAllMediaMetadata()
    urls.forEach((u) => {
      const key = getSafeMetaKey(u)
      delete meta[key]
    })
    safeLocalStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(meta))
  } catch {}
}

export async function fetchAllMediaImages(): Promise<MediaImage[]> {
  const results: MediaImage[] = []
  const seenUrls = new Set<string>()
  const deletedUrls = getDeletedImageUrls()
  const metadata = getAllMediaMetadata()

  const addImage = (img: Omit<MediaImage, 'alt'> & { alt?: string }) => {
    if (!img.url || typeof img.url !== 'string' || img.url.trim() === '') return
    const cleanUrl = img.url.trim()
    if (seenUrls.has(cleanUrl) || deletedUrls.has(cleanUrl)) return
    seenUrls.add(cleanUrl)

    const metaKey = getSafeMetaKey(cleanUrl)
    const savedMeta = metadata[metaKey] || metadata[cleanUrl] || {}
    const finalAlt = savedMeta.alt || img.alt || `${img.title} - Pizza Expert Prayagraj`
    const finalTitle = savedMeta.title || img.title

    results.push({
      ...img,
      url: cleanUrl,
      title: finalTitle,
      alt: finalAlt,
    })
  }

  // 1. User Uploads from IndexedDB (High capacity storage)
  if (typeof window !== 'undefined') {
    try {
      let idbUploads = await idbGet<Array<{ id: string; url: string; title: string; alt?: string; addedAt?: string }>>(IDB_UPLOADS_KEY)
      
      // Fallback migration from legacy localStorage if IDB is empty
      if (!idbUploads || idbUploads.length === 0) {
        const legacyRaw = localStorage.getItem('pizza_uploaded_images_history')
        if (legacyRaw) {
          try {
            const legacyList = JSON.parse(legacyRaw)
            if (Array.isArray(legacyList) && legacyList.length > 0) {
              idbUploads = legacyList
              await idbSet(IDB_UPLOADS_KEY, legacyList)
              // Reclaim localStorage quota
              localStorage.removeItem('pizza_uploaded_images_history')
            }
          } catch {}
        }
      }

      if (Array.isArray(idbUploads)) {
        idbUploads.forEach((item, index) => {
          addImage({
            id: item.id || `upload-${index}`,
            url: item.url,
            title: item.title || `Uploaded Image ${index + 1}`,
            alt: item.alt || item.title || `Uploaded photo ${index + 1}`,
            category: 'uploads',
            source: 'uploaded',
            addedAt: item.addedAt,
          })
        })
      }
    } catch (err) {
      console.warn('Failed to read uploaded images from IndexedDB', err)
    }
  }

  // 2. Fetch from Supabase tables (categories, product_images) with graceful fallbacks
  try {
    const supabase = createClient()

    // Remote categories
    try {
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
              alt: `${cat.name} category menu banner`,
              category: categorizeImage(cat.name || cat.slug || ''),
              source: 'database',
            })
          }
        })
      }
    } catch {}

    // Remote product images
    try {
      const { data: remoteProductImages } = await supabase
        .from('product_images')
        .select('id, image_url, product_id')
        .limit(100)

      if (remoteProductImages && Array.isArray(remoteProductImages)) {
        remoteProductImages.forEach((img) => {
          if (img.image_url) {
            addImage({
              id: `db-pimg-${img.id}`,
              url: img.image_url,
              title: 'Menu Product Photo',
              alt: 'Freshly prepared item at Pizza Expert Prayagraj',
              category: 'pizzas',
              source: 'database',
            })
          }
        })
      }
    } catch {}
  } catch (err) {
    console.warn('Could not query Supabase tables in media library', err)
  }

  // 3. Fallback Local Storage Items (Offline / Local Mode)
  if (typeof window !== 'undefined') {
    try {
      const storedCategoriesRaw = safeLocalStorage.getItem('pizza_categories')
      if (storedCategoriesRaw) {
        const storedCategories = JSON.parse(storedCategoriesRaw)
        if (Array.isArray(storedCategories)) {
          storedCategories.forEach((cat) => {
            const imgUrl = cat.imageUrl || cat.image_url
            if (imgUrl) {
              addImage({
                id: `local-cat-${cat.id || cat.slug}`,
                url: imgUrl,
                title: `${cat.name || cat.slug} (Category)`,
                alt: `${cat.name || cat.slug} food category banner`,
                category: categorizeImage(cat.name || cat.slug || ''),
                source: imgUrl.startsWith('data:') ? 'uploaded' : 'database',
              })
            }
          })
        }
      }

      const storedProductsRaw = safeLocalStorage.getItem('pizza_products')
      if (storedProductsRaw) {
        const storedProducts = JSON.parse(storedProductsRaw)
        if (Array.isArray(storedProducts)) {
          storedProducts.forEach((prod) => {
            const imgUrl = prod.imageUrl || prod.image_url || (prod.images && prod.images[0]?.image_url)
            if (imgUrl) {
              addImage({
                id: `local-prod-${prod.id || prod.slug}`,
                url: imgUrl,
                title: prod.name || prod.slug || 'Menu Item',
                alt: `${prod.name || prod.slug} delicious menu dish`,
                category: categorizeImage(prod.name || prod.slug || ''),
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
      alt: `${formatSlugTitle(key)} at Pizza Expert Prayagraj`,
      category: categorizeImage(key),
      source: 'stock',
    })
  })

  return results
}

export async function saveUploadedImageToHistory(url: string, title?: string, alt?: string): Promise<void> {
  if (typeof window === 'undefined' || !url) return

  try {
    let list = (await idbGet<Array<{ id: string; url: string; title: string; alt?: string; addedAt?: string }>>(IDB_UPLOADS_KEY)) || []
    if (!Array.isArray(list)) list = []

    // Filter out duplicate URL
    list = list.filter((item) => item.url !== url)

    const finalTitle = title || `Upload ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    const finalAlt = alt || `${finalTitle} - Pizza Expert Prayagraj`

    // Add to front of list
    list.unshift({
      id: `upload-${Date.now()}`,
      url,
      title: finalTitle,
      alt: finalAlt,
      addedAt: new Date().toISOString(),
    })

    // Also remove from deleted URLs if it was previously deleted
    const deletedSet = getDeletedImageUrls()
    if (deletedSet.has(url)) {
      deletedSet.delete(url)
      try {
        safeLocalStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)))
      } catch {}
    }

    // Keep up to 100 uploads in IndexedDB
    if (list.length > 100) {
      list = list.slice(0, 100)
    }

    await idbSet(IDB_UPLOADS_KEY, list)

    // Update metadata store using safe key
    updateImageMetadata(url, { alt: finalAlt, title: finalTitle })
  } catch (err) {
    console.error('Failed to save uploaded image to history', err)
  }
}
