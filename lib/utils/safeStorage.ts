/**
 * Safe client-side storage utility using IndexedDB + Quota-safe LocalStorage adapter
 * Prevents QuotaExceededError crashes across the application.
 */

const IDB_NAME = 'pizza_expert_db'
const IDB_STORE = 'media_and_settings'

// Simple Native IndexedDB Wrapper (Zero external dependencies)
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'))
      return
    }
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      const request = store.put(value, key)
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      const request = store.delete(key)
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/**
 * Clean up legacy bloated keys in localStorage to immediately free quota
 */
export function purgeBloatedLocalStorage(): void {
  if (typeof window === 'undefined') return
  try {
    // Check and prune oversized raw base64 caches if present
    const bloatedKeys = ['pizza_uploaded_images_history', 'pizza_media_metadata']
    bloatedKeys.forEach((key) => {
      const raw = localStorage.getItem(key)
      if (raw && raw.length > 500000) {
        // If greater than 500KB, prune it
        localStorage.removeItem(key)
      }
    })
  } catch {}
}

/**
 * Safe synchronous LocalStorage wrapper that catches QuotaExceededError
 * and recovers automatically by pruning legacy caches.
 */
export const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(name, value)
    } catch (err: any) {
      console.warn(`LocalStorage quota exceeded on "${name}". Auto-pruning old caches...`, err)
      purgeBloatedLocalStorage()
      try {
        localStorage.setItem(name, value)
      } catch (retryErr) {
        console.error(`Could not persist "${name}" to localStorage even after pruning:`, retryErr)
      }
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(name)
    } catch {}
  },
}
