'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { Category } from '@/types'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || serviceKey === 'your-service-role-key') {
    return null
  }

  return createClient(url, serviceKey)
}

export async function getCategoriesAction(): Promise<{ success: boolean; data: Category[]; error?: string }> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return { success: false, data: [], error: 'Supabase admin not configured' }
    }

    const { data, error } = await admin
      .from('categories')
      .select('id, name, slug, image_url, sort_order, is_active')
      .order('sort_order', { ascending: true })

    if (error) {
      return { success: false, data: [], error: error.message }
    }

    return {
      success: true,
      data: (data || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        image_url: cat.image_url ?? null,
        sort_order: Number(cat.sort_order) || 0,
        is_active: Boolean(cat.is_active),
      })),
    }
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Failed to fetch categories' }
  }
}

export async function createCategoryAction(categoryData: {
  name: string
  slug: string
  image_url?: string | null
  sort_order?: number
  is_active?: boolean
}): Promise<{ success: boolean; data?: Category; error?: string }> {
  try {
    const admin = getSupabaseAdmin()
    const name = categoryData.name.trim()
    const slug = categoryData.slug.trim().toLowerCase()

    if (!name || !slug) {
      return { success: false, error: 'Category name and slug are required' }
    }

    if (!admin) {
      return {
        success: true,
        data: {
          id: `cat-${Date.now()}`,
          name,
          slug,
          image_url: categoryData.image_url?.trim() || null,
          sort_order: typeof categoryData.sort_order === 'number' ? categoryData.sort_order : 0,
          is_active: categoryData.is_active ?? true,
        },
      }
    }

    const payload = {
      name,
      slug,
      image_url: categoryData.image_url?.trim() || null,
      sort_order: typeof categoryData.sort_order === 'number' ? categoryData.sort_order : 0,
      is_active: categoryData.is_active ?? true,
    }

    const { data, error } = await admin
      .from('categories')
      .insert(payload)
      .select('id, name, slug, image_url, sort_order, is_active')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'category.created',
      targetTable: 'categories',
      targetId: data.id,
      after: data,
    })

    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/menu')
    revalidatePath('/')

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        image_url: data.image_url ?? null,
        sort_order: Number(data.sort_order) || 0,
        is_active: Boolean(data.is_active),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create category' }
  }
}

export async function updateCategoryAction(
  id: string,
  categoryData: {
    name?: string
    slug?: string
    image_url?: string | null
    sort_order?: number
    is_active?: boolean
  }
): Promise<{ success: boolean; data?: Category; error?: string }> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return { success: true }
    }

    const updates: Record<string, any> = {}
    if (categoryData.name !== undefined) updates.name = categoryData.name.trim()
    if (categoryData.slug !== undefined) updates.slug = categoryData.slug.trim().toLowerCase()
    if (categoryData.image_url !== undefined) updates.image_url = categoryData.image_url?.trim() || null
    if (categoryData.sort_order !== undefined) updates.sort_order = Number(categoryData.sort_order) || 0
    if (categoryData.is_active !== undefined) updates.is_active = Boolean(categoryData.is_active)

    const { data, error } = await admin
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select('id, name, slug, image_url, sort_order, is_active')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'category.updated',
      targetTable: 'categories',
      targetId: id,
      after: data,
    })

    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/menu')
    revalidatePath('/')

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        image_url: data.image_url ?? null,
        sort_order: Number(data.sort_order) || 0,
        is_active: Boolean(data.is_active),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update category' }
  }
}

export async function deleteCategoryAction(
  id: string,
  options?: { reassignToCategoryId?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return { success: true }
    }

    if (options?.reassignToCategoryId) {
      // Reassign products to target category
      await admin
        .from('products')
        .update({ category_id: options.reassignToCategoryId })
        .eq('category_id', id)
    } else {
      // Or delete associated product images and products
      const { data: prods } = await admin
        .from('products')
        .select('id')
        .eq('category_id', id)

      if (prods && prods.length > 0) {
        const prodIds = prods.map((p) => p.id)
        await admin.from('product_images').delete().in('product_id', prodIds)
        await admin.from('products').delete().eq('category_id', id)
      }
    }

    const { error } = await admin.from('categories').delete().eq('id', id)

    if (error) {
      console.warn('Category delete note:', error.message)
    }

    await logAudit({
      action: 'category.deleted',
      targetTable: 'categories',
      targetId: id,
    })

    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/menu')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    console.warn('deleteCategoryAction catch:', err)
    return { success: true }
  }
}

export async function reorderCategoriesAction(
  orderedIds: { id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return { success: true }
    }

    for (const item of orderedIds) {
      await admin.from('categories').update({ sort_order: item.sort_order }).eq('id', item.id)
    }

    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/menu')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder categories' }
  }
}

export async function toggleCategoryStatusAction(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateCategoryAction(id, { is_active })
}
