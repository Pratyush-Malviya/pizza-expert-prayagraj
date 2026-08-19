'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'

export interface RecipeItemInput {
  ingredientId: string
  quantity: number
}

// ─── Get Products with Recipe Costing & Margin % ────────────────────────────

export async function getProductsWithCosting() {
  await requireUser(['inventory_manager', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    // 1. Fetch Products with Category
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, category:categories(id, name), is_available, is_veg')
      .order('name', { ascending: true })

    if (prodErr) throw new Error(prodErr.message)

    // 2. Fetch all Recipe Items & Ingredients
    const { data: recipeItems, error: recipeErr } = await supabase
      .from('recipe_items')
      .select(`
        id,
        product_id,
        quantity,
        ingredient:ingredients(
          id,
          name,
          unit,
          cost_per_unit,
          current_stock
        )
      `)

    if (recipeErr) throw new Error(recipeErr.message)

    // 3. Map Recipe BOM and calculate food cost per product
    const productsWithBOM = (products || []).map((product) => {
      const items = (recipeItems || []).filter((r) => r.product_id === product.id)
      const ingredientCost = items.reduce((acc, item: any) => {
        const costPerUnit = Number(item.ingredient?.cost_per_unit || 0)
        return acc + (Number(item.quantity || 0) * costPerUnit)
      }, 0)

      const sellingPrice = Number(product.price || 0)
      const foodCostPercentage = sellingPrice > 0 ? (ingredientCost / sellingPrice) * 100 : 0
      const grossMargin = Math.max(0, sellingPrice - ingredientCost)
      const grossMarginPercentage = sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : 0

      return {
        ...product,
        recipeItems: items,
        ingredientCost,
        foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
        grossMargin,
        grossMarginPercentage: Math.round(grossMarginPercentage * 10) / 10,
        hasRecipe: items.length > 0,
      }
    })

    return { success: true, products: productsWithBOM }
  } catch (err: any) {
    return { success: false, error: err.message, products: [] }
  }
}

// ─── Get Single Product Recipe BOM ──────────────────────────────────────────

export async function getProductRecipeBOM(productId: string) {
  await requireUser(['inventory_manager', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    const [{ data: product }, { data: recipeItems }, { data: ingredients }] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase.from('recipe_items').select('*, ingredient:ingredients(*)').eq('product_id', productId),
      supabase.from('ingredients').select('*').order('name', { ascending: true }),
    ])

    const items = recipeItems || []
    const totalCost = items.reduce((acc, item: any) => {
      return acc + (Number(item.quantity || 0) * Number(item.ingredient?.cost_per_unit || 0))
    }, 0)

    const sellingPrice = Number(product?.price || 0)
    const foodCostPercentage = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0

    return {
      success: true,
      product,
      recipeItems: items,
      allIngredients: ingredients || [],
      totalCost,
      foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
    }
  } catch (err: any) {
    return { success: false, error: err.message, product: null, recipeItems: [], allIngredients: [], totalCost: 0, foodCostPercentage: 0 }
  }
}

// ─── Save / Update Product Recipe BOM ───────────────────────────────────────

export async function saveRecipeBOM(productId: string, items: RecipeItemInput[]) {
  await requireUser(['inventory_manager', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    // 1. Delete existing recipe items for this product
    await supabase
      .from('recipe_items')
      .delete()
      .eq('product_id', productId)

    // 2. Insert updated recipe items
    if (items.length > 0) {
      const rows = items.map((item) => ({
        product_id: productId,
        ingredient_id: item.ingredientId,
        quantity: item.quantity,
      }))

      const { error } = await supabase.from('recipe_items').insert(rows)
      if (error) throw new Error(error.message)
    }

    revalidatePath('/admin/recipes')
    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
