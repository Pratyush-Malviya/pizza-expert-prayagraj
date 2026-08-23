import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from '@/lib/constants/defaultMenu'

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'

const DEFAULT_CATEGORY_IMAGES: Array<[RegExp, string]> = [
  [/pizza/i, FOOD_IMAGES['margherita-pizza']],
  [/burger/i, FOOD_IMAGES['chicken-zinger-burger']],
  [/pasta/i, FOOD_IMAGES['penne-arrabiata']],
  [/side|starter|fries|garlic/i, FOOD_IMAGES['garlic-bread']],
  [/beverage|drink|cola|soft drink|lassi|shake|juice|soda/i, FOOD_IMAGES['mango-lassi']],
  [/combo|meal|feast|signature/i, FOOD_IMAGES['family-feast-combo']],
  [/dessert|cake|brownie|ice.?cream|sweet/i, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80'],
  [/chinese|noodle|manchurian|fried.?rice/i, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80'],
]

function resolveCategoryImage(name: string, slug: string, firstProductImage?: string): string {
  const haystack = `${slug} ${name}`
  for (const [pattern, image] of DEFAULT_CATEGORY_IMAGES) {
    if (pattern.test(haystack)) return image
  }
  return firstProductImage || DEFAULT_PRODUCT_IMAGE
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId') || null
    const categoryId = searchParams.get('categoryId') || null

    let supabase: any = null
    try {
      supabase = await createClient()
    } catch {
      try {
        supabase = await createAdminClient()
      } catch {}
    }

    if (!supabase) {
      return returnFallbackResponse(categoryId)
    }

    // ── 1. Fetch active categories ──────────────────────────────────────
    let rawCategories: any[] | null = null
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (!error && data && data.length > 0) {
        rawCategories = data
      }
    } catch (e) {
      console.warn('Could not query categories from DB, falling back to seed:', e)
    }

    if (!rawCategories || rawCategories.length === 0) {
      return returnFallbackResponse(categoryId)
    }

    // ── 2. Fetch available products (optionally scoped) ────────────────
    let rawProducts: any[] | null = null
    try {
      let productsQuery = supabase
        .from('products')
        .select('id, name, slug, description, price, is_veg, is_spicy, category_id')
        .eq('is_available', true)

      if (storeId) productsQuery = productsQuery.eq('store_id', storeId)
      if (categoryId) productsQuery = productsQuery.eq('category_id', categoryId)

      const { data, error } = await productsQuery
      if (!error && data) {
        rawProducts = data
      }
    } catch (e) {
      console.warn('Could not query products from DB, using fallback:', e)
    }

    if (!rawProducts || rawProducts.length === 0) {
      return returnFallbackResponse(categoryId)
    }

    // ── 3. Fetch product images ─────────────────────────────────────────
    const productIds = rawProducts.map((p) => p.id)
    let productImages: Array<{ product_id: string; image_url: string }> = []
    if (productIds.length > 0) {
      try {
        const { data: images } = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .in('product_id', productIds)
        productImages = (images || []) as Array<{ product_id: string; image_url: string }>
      } catch {}
    }

    const imageByProductId = new Map(productImages.map((img) => [img.product_id, img.image_url]))

    // ── 4. Build products payload ───────────────────────────────────────
    const products = rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      price: Number(p.price) || 0,
      imageUrl: imageByProductId.get(p.id) || FOOD_IMAGES[p.slug] || DEFAULT_PRODUCT_IMAGE,
      isVeg: Boolean(p.is_veg),
      isSpicy: Boolean(p.is_spicy),
      categoryId: p.category_id,
    }))

    // ── 5. Build categories payload with image + product count ─────────
    const categories = rawCategories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id)
      const firstImage = catProducts[0]?.imageUrl
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: resolveCategoryImage(cat.name, cat.slug, firstImage),
        productCount: catProducts.length,
      }
    })

    return NextResponse.json({
      success: true,
      categories,
      products: categoryId ? products : null,
    })
  } catch (err: any) {
    console.error('Menu fetch exception, serving fallback:', err)
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId') || null
    return returnFallbackResponse(categoryId)
  }
}

function returnFallbackResponse(categoryId: string | null) {
  const filteredProducts = categoryId
    ? FALLBACK_PRODUCTS.filter(
        (p) =>
          p.categoryId === categoryId ||
          p.categoryId.includes(categoryId) ||
          categoryId.includes(p.categoryId)
      )
    : FALLBACK_PRODUCTS

  return NextResponse.json({
    success: true,
    categories: FALLBACK_CATEGORIES,
    products: categoryId ? (filteredProducts.length > 0 ? filteredProducts : FALLBACK_PRODUCTS) : null,
  })
}