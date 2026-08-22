'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Pizza,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
  Percent,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Category } from '@/types'
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  toggleCategoryStatusAction,
  updateCategoryAction,
} from '@/app/actions/categories'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-pizzas', name: 'Pizzas', slug: 'pizzas', image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 1 },
  { id: 'cat-burgers', name: 'Burgers', slug: 'burgers', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 2 },
  { id: 'cat-pasta', name: 'Pasta', slug: 'pasta', image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 3 },
  { id: 'cat-sandwiches', name: 'Sandwiches', slug: 'sandwiches', image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 4 },
  { id: 'cat-sides', name: 'Sides', slug: 'sides', image_url: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 5 },
  { id: 'cat-beverages', name: 'Beverages', slug: 'beverages', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 6 },
  { id: 'cat-combos', name: 'Combos', slug: 'combos', image_url: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 7 },
  { id: 'cat-desserts', name: 'Desserts', slug: 'desserts', image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80', is_active: true, sort_order: 8 },
]

interface ProductItem {
  id: string
  name: string
  slug?: string
  category_id: string
  category?: string
  price?: number
  description?: string
  image_url?: string
  is_veg?: boolean
  is_spicy?: boolean
  is_bestseller?: boolean
  is_available?: boolean
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteMode, setDeleteMode] = useState<'reassign' | 'delete_all'>('reassign')
  const [reassignTargetId, setReassignTargetId] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Form State
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(1)
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const persistCategories = useCallback((updated: Category[]) => {
    setCategories(updated)
    try {
      localStorage.setItem('pizza_categories', JSON.stringify(updated))
    } catch {}
  }, [])

  const persistProducts = useCallback((updated: ProductItem[]) => {
    setProducts(updated)
    try {
      localStorage.setItem('pizza_products', JSON.stringify(updated))
    } catch {}
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Check localStorage first
      const storedCategoriesRaw = localStorage.getItem('pizza_categories')
      let localCats: Category[] = []

      if (storedCategoriesRaw) {
        try {
          const parsed = JSON.parse(storedCategoriesRaw)
          if (Array.isArray(parsed)) {
            localCats = parsed
          }
        } catch {}
      } else {
        localCats = DEFAULT_CATEGORIES
        localStorage.setItem('pizza_categories', JSON.stringify(DEFAULT_CATEGORIES))
      }

      setCategories(localCats)

      // Load products from localStorage
      const storedProductsRaw = localStorage.getItem('pizza_products')
      if (storedProductsRaw) {
        try {
          const parsedProds = JSON.parse(storedProductsRaw)
          if (Array.isArray(parsedProds)) {
            setProducts(parsedProds)
          }
        } catch {}
      }

      // 2. Fetch from Supabase if available
      const supabase = createClient()
      const { data: remoteCats, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, image_url, sort_order, is_active')
        .order('sort_order', { ascending: true })

      if (!catError && remoteCats && remoteCats.length > 0) {
        const mapped: Category[] = remoteCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image_url: c.image_url ?? null,
          sort_order: Number(c.sort_order) || 0,
          is_active: Boolean(c.is_active),
        }))
        setCategories(mapped)
        localStorage.setItem('pizza_categories', JSON.stringify(mapped))
      }

      const { data: remoteProds } = await supabase
        .from('products')
        .select('id, name, category_id')

      if (remoteProds && remoteProds.length > 0) {
        setProducts((prev) => {
          const merged = [...prev]
          remoteProds.forEach((rp: any) => {
            const idx = merged.findIndex((p) => p.id === rp.id)
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...rp }
            } else {
              merged.push(rp)
            }
          })
          return merged
        })
      }
    } catch (err) {
      console.warn('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Count products per category
  const productCountMap = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1
      }
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1
      }
    })
    return counts
  }, [products])

  const getProductCount = (category: Category): number => {
    return (
      productCountMap[category.id] ||
      productCountMap[category.slug] ||
      productCountMap[category.name] ||
      0
    )
  }

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const query = search.trim().toLowerCase()
        const matchesQuery =
          !query ||
          cat.name.toLowerCase().includes(query) ||
          cat.slug.toLowerCase().includes(query)

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && cat.is_active) ||
          (statusFilter === 'inactive' && !cat.is_active)

        return matchesQuery && matchesStatus
      })
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [categories, search, statusFilter])

  // Bulk Price Adjuster State
  const [bulkPriceModalCat, setBulkPriceModalCat] = useState<Category | null>(null)
  const [adjustType, setAdjustType] = useState<'flat' | 'percent'>('flat')
  const [adjustDelta, setAdjustDelta] = useState<number>(10)
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase')
  const [isAdjustingPrices, setIsAdjustingPrices] = useState(false)

  const handleBulkPriceAdjust = async () => {
    if (!bulkPriceModalCat || !adjustDelta) return
    setIsAdjustingPrices(true)

    try {
      const supabase = createClient()
      const targetCatId = bulkPriceModalCat.id
      const targetCatSlug = bulkPriceModalCat.slug

      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, price, category_id')
        .or(`category_id.eq.${targetCatId}`)

      let localProducts = JSON.parse(localStorage.getItem('pizza_products') || '[]')
      let count = 0

      localProducts = localProducts.map((prod: any) => {
        if (prod.category_id === targetCatId || prod.category === targetCatSlug || prod.category?.slug === targetCatSlug) {
          count++
          const delta = adjustType === 'flat' ? adjustDelta : Math.round((prod.price * adjustDelta) / 100)
          const nextPrice = adjustDirection === 'increase' ? prod.price + delta : Math.max(1, prod.price - delta)
          return { ...prod, price: nextPrice }
        }
        return prod
      })
      localStorage.setItem('pizza_products', JSON.stringify(localProducts))

      if (dbProducts && dbProducts.length > 0) {
        for (const p of dbProducts) {
          const delta = adjustType === 'flat' ? adjustDelta : Math.round((Number(p.price) * adjustDelta) / 100)
          const nextPrice = adjustDirection === 'increase' ? Number(p.price) + delta : Math.max(1, Number(p.price) - delta)
          await supabase.from('products').update({ price: nextPrice }).eq('id', p.id)
        }
      }

      toast.success(`Successfully adjusted prices for ${count || dbProducts?.length || 0} products in "${bulkPriceModalCat.name}"!`)
      setBulkPriceModalCat(null)
    } catch (err) {
      toast.error('Could not adjust prices')
    } finally {
      setIsAdjustingPrices(false)
    }
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCategory(null)
    setFormName('')
    setFormSlug('')
    setFormImageUrl('')
    setFormSortOrder(categories.length + 1)
    setFormIsActive(true)
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setFormImageUrl(cat.image_url || '')
    setFormSortOrder(cat.sort_order)
    setFormIsActive(cat.is_active)
    setShowModal(true)
  }

  // Image Upload Handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Category image must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormImageUrl(reader.result as string)
      toast.success('Category image uploaded')
    }
    reader.readAsDataURL(file)
  }

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = formName.trim()
    const slug = slugify(formSlug || name)

    if (!name) {
      toast.error('Category name is required')
      return
    }
    if (!slug) {
      toast.error('Category slug is required')
      return
    }

    const duplicate = categories.find(
      (c) => c.slug === slug && c.id !== editingCategory?.id
    )
    if (duplicate) {
      toast.error(`Category with slug "${slug}" already exists`)
      return
    }

    setIsSubmitting(true)
    const categoryPayload = {
      name,
      slug,
      image_url: formImageUrl.trim() || null,
      sort_order: Number(formSortOrder) || 0,
      is_active: formIsActive,
    }

    try {
      if (editingCategory) {
        // Update existing
        await updateCategoryAction(editingCategory.id, categoryPayload)
        const updatedCat: Category = {
          id: editingCategory.id,
          ...categoryPayload,
        }

        const nextList = categories.map((c) =>
          c.id === editingCategory.id ? updatedCat : c
        )
        persistCategories(nextList)
        toast.success(`Category "${name}" updated`)
      } else {
        // Create new
        let newId = `cat-${Date.now()}`
        const res = await createCategoryAction(categoryPayload)
        if (res.data) {
          newId = res.data.id
        }

        const newCat: Category = {
          id: newId,
          ...categoryPayload,
        }
        const nextList = [...categories, newCat].sort((a, b) => a.sort_order - b.sort_order)
        persistCategories(nextList)
        toast.success(`Category "${name}" created successfully`)
      }
      setShowModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Status
  const handleToggleStatus = async (cat: Category) => {
    const nextState = !cat.is_active
    const nextList = categories.map((c) =>
      c.id === cat.id ? { ...c, is_active: nextState } : c
    )
    persistCategories(nextList)

    try {
      await toggleCategoryStatusAction(cat.id, nextState)
      toast.success(`"${cat.name}" is now ${nextState ? 'Active' : 'Hidden'}`)
    } catch {
      toast.success(`"${cat.name}" status updated`)
    }
  }

  // Move Sort Order Up / Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= filteredCategories.length) return

    const currentItem = filteredCategories[index]
    const swapItem = filteredCategories[targetIndex]

    const updatedCategories = categories.map((c) => {
      if (c.id === currentItem.id) {
        return { ...c, sort_order: swapItem.sort_order }
      }
      if (c.id === swapItem.id) {
        return { ...c, sort_order: currentItem.sort_order }
      }
      return c
    }).sort((a, b) => a.sort_order - b.sort_order)

    persistCategories(updatedCategories)

    try {
      await reorderCategoriesAction([
        { id: currentItem.id, sort_order: swapItem.sort_order },
        { id: swapItem.id, sort_order: currentItem.sort_order },
      ])
    } catch (err) {
      console.warn('Reorder sync error:', err)
    }
  }

  // Open Delete Modal
  const handleOpenDeleteModal = (cat: Category) => {
    setDeleteTarget(cat)
    const otherCategories = categories.filter((c) => c.id !== cat.id)
    setReassignTargetId(otherCategories[0]?.id || '')
    setDeleteMode('reassign')
  }

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    const targetCat = deleteTarget
    const pCount = getProductCount(targetCat)

    try {
      // 1. Handle product reassignment or deletion locally
      if (pCount > 0) {
        if (deleteMode === 'reassign' && reassignTargetId) {
          const targetCategoryObj = categories.find((c) => c.id === reassignTargetId)
          const updatedProducts = products.map((p) => {
            const matchesCat =
              p.category_id === targetCat.id ||
              p.category_id === targetCat.slug ||
              p.category === targetCat.name ||
              p.category === targetCat.slug

            if (matchesCat && targetCategoryObj) {
              return {
                ...p,
                category_id: targetCategoryObj.id,
                category: targetCategoryObj.name,
              }
            }
            return p
          })
          persistProducts(updatedProducts)
        } else {
          // Delete products in this category
          const updatedProducts = products.filter((p) => {
            const matchesCat =
              p.category_id === targetCat.id ||
              p.category_id === targetCat.slug ||
              p.category === targetCat.name ||
              p.category === targetCat.slug
            return !matchesCat
          })
          persistProducts(updatedProducts)
        }
      }

      // 2. Remove category from list
      const nextCategories = categories.filter((c) => c.id !== targetCat.id)
      persistCategories(nextCategories)

      // 3. Call Server Action
      await deleteCategoryAction(targetCat.id, {
        reassignToCategoryId: deleteMode === 'reassign' ? reassignTargetId : undefined,
      })

      toast.success(`Category "${targetCat.name}" deleted successfully`)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category')
    } finally {
      setIsDeleting(false)
    }
  }

  // Stats
  const totalCategories = categories.length
  const activeCategories = categories.filter((c) => c.is_active).length
  const inactiveCategories = categories.filter((c) => !c.is_active).length
  const totalProductsAssigned = products.length

  const otherCategoriesForReassign = useMemo(() => {
    if (!deleteTarget) return []
    return categories.filter((c) => c.id !== deleteTarget.id)
  }, [categories, deleteTarget])

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A8A29E] mb-1">
            <Link href="/admin" className="hover:text-[#1C1917]">Admin</Link>
            <span>/</span>
            <Link href="/admin/products" className="hover:text-[#1C1917]">Menu</Link>
            <span>/</span>
            <span className="text-[#1C1917] font-semibold">Categories</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] flex items-center gap-2.5">
            <Layers className="text-[#B91C1C]" size={26} /> Category Management
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm mt-0.5">
            Create, edit, reorder, and configure customer-facing menu sections and taxonomies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/products"
            className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs"
          >
            <Pizza size={15} /> View Products
          </Link>
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs shadow-xs"
          >
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#A8A29E] mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">Total Categories</span>
            <Layers size={16} className="text-[#B91C1C]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#1C1917]">{totalCategories}</p>
          <p className="text-[11px] text-[#78716C] mt-0.5">All menu taxonomies</p>
        </div>

        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#A8A29E] mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">Active</span>
            <CheckCircle2 size={16} className="text-[#15803D]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#15803D]">{activeCategories}</p>
          <p className="text-[11px] text-[#78716C] mt-0.5">Visible on live store</p>
        </div>

        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#A8A29E] mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">Hidden</span>
            <XCircle size={16} className="text-[#B91C1C]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#B91C1C]">{inactiveCategories}</p>
          <p className="text-[11px] text-[#78716C] mt-0.5">Drafted or archived</p>
        </div>

        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#A8A29E] mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">Assigned Products</span>
            <Pizza size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#1C1917]">{totalProductsAssigned}</p>
          <p className="text-[11px] text-[#78716C] mt-0.5">Dishes across categories</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E7E0D8] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category by name, slug..."
              className="input-field pl-10 pr-3 py-2 text-xs sm:text-sm bg-[#FBF9F5]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg p-1 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  statusFilter === 'all' ? 'bg-[#B91C1C] text-white shadow-xs' : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                All ({totalCategories})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  statusFilter === 'active' ? 'bg-[#B91C1C] text-white shadow-xs' : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Active ({activeCategories})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  statusFilter === 'inactive' ? 'bg-[#B91C1C] text-white shadow-xs' : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Hidden ({inactiveCategories})
              </button>
            </div>

            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
              className="btn btn-outline btn-sm text-xs px-2.5"
              title="Toggle View Mode"
            >
              {viewMode === 'table' ? 'Grid View' : 'Table View'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E7E0D8] flex items-center justify-between bg-[#FBF9F5]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
              {loading ? 'Loading categories...' : `${filteredCategories.length} Categories`}
            </span>
            <span className="text-[11px] text-[#78716C]">
              Use arrows to adjust menu display order
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="text-[10px] text-[#A8A29E] font-bold uppercase bg-[#FBF9F5]/70 border-b border-[#E7E0D8]">
                  <th className="py-3 pl-5 w-16">Order</th>
                  <th className="py-3 pl-2">Category</th>
                  <th className="py-3">Slug</th>
                  <th className="py-3">Products</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]/60">
                {filteredCategories.map((cat, index) => {
                  const pCount = getProductCount(cat)
                  return (
                    <tr key={cat.id} className="hover:bg-[#FBF9F5] transition-colors">
                      {/* Sort Order & Up/Down Arrows */}
                      <td className="py-3 pl-5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-[#1C1917] w-5 text-center">
                            {cat.sort_order}
                          </span>
                          <div className="flex flex-col">
                            <button
                              disabled={index === 0}
                              onClick={() => handleMoveOrder(index, 'up')}
                              className="text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-20 p-0.5 transition-colors"
                              title="Move Up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              disabled={index === filteredCategories.length - 1}
                              onClick={() => handleMoveOrder(index, 'down')}
                              className="text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-20 p-0.5 transition-colors"
                              title="Move Down"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Name & Thumbnail */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative w-10 h-10 rounded-lg bg-[#FBF9F5] border border-[#E7E0D8] overflow-hidden shrink-0">
                            {cat.image_url ? (
                              <Image
                                src={cat.image_url}
                                alt={cat.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#A8A29E]">
                                <Tag size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-serif font-bold text-[#1C1917]">{cat.name}</p>
                            <p className="text-[11px] text-[#A8A29E]">ID: {cat.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3">
                        <span className="font-mono text-xs text-[#57534E] bg-[#FBF9F5] px-2 py-0.5 rounded border border-[#E7E0D8]">
                          /{cat.slug}
                        </span>
                      </td>

                      {/* Products */}
                      <td className="py-3">
                        <Link
                          href={`/admin/products`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100 transition-colors"
                        >
                          <Pizza size={12} className="text-amber-700" />
                          <span>{pCount} dishes</span>
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                            cat.is_active
                              ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/20 hover:bg-green-100'
                              : 'bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/20 hover:bg-red-100'
                          }`}
                        >
                          {cat.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {cat.is_active ? 'Active' : 'Hidden'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setBulkPriceModalCat(cat)}
                            title="Bulk Adjust Prices"
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                          >
                            <Percent size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            title="Edit Category"
                            className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FBF9F5] rounded transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(cat)}
                            title="Delete Category"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#A8A29E] text-sm">
                      No categories match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid / Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat, index) => {
            const pCount = getProductCount(cat)
            return (
              <div
                key={cat.id}
                className="bg-white border border-[#E7E0D8] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-32 bg-[#FBF9F5] border-b border-[#E7E0D8]">
                    {cat.image_url ? (
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        fill
                        sizes="300px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#A8A29E]">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-[#1C1917]/80 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                      #{cat.sort_order}
                    </div>
                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-xs ${
                          cat.is_active
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-serif font-bold text-base text-[#1C1917]">
                        {cat.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-[#78716C] bg-[#FBF9F5] px-2 py-0.5 rounded border border-[#E7E0D8]">
                        {pCount} items
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[#78716C]">/{cat.slug}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-[#E7E0D8] mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveOrder(index, 'up')}
                      className="btn btn-outline btn-xs p-1"
                      title="Move Left/Up"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      disabled={index === filteredCategories.length - 1}
                      onClick={() => handleMoveOrder(index, 'down')}
                      className="btn btn-outline btn-xs p-1"
                      title="Move Right/Down"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBulkPriceModalCat(cat)}
                      title="Bulk Price Adjust"
                      className="btn btn-outline btn-xs p-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                    >
                      <Percent size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(cat)}
                      className="btn btn-outline btn-xs text-[11px]"
                    >
                      {cat.is_active ? 'Hide' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      className="btn btn-outline btn-xs p-1.5"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(cat)}
                      className="btn btn-outline btn-xs p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-[#A8A29E] hover:text-[#1C1917]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (!editingCategory) {
                      setFormSlug(slugify(e.target.value))
                    }
                  }}
                  className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                  placeholder="e.g. Sourdough Pizzas, Mocktails"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(slugify(e.target.value))}
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                  placeholder="e.g. sourdough-pizzas"
                  required
                />
                <p className="text-[10px] text-[#A8A29E] mt-1">
                  Used in URL routing and category filter tags.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1C1917]">
                  Category Banner / Image
                </label>

                {/* Preview Box if image exists */}
                {formImageUrl ? (
                  <div className="relative h-28 rounded-xl border border-[#E7E0D8] overflow-hidden bg-[#FBF9F5] group">
                    <Image
                      src={formImageUrl}
                      alt="Category preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs transition-colors shadow-xs"
                      title="Remove Image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 rounded-xl border border-dashed border-[#E7E0D8] bg-[#FBF9F5] flex flex-col items-center justify-center text-[#A8A29E] gap-1">
                    <ImageIcon size={22} />
                    <span className="text-[11px]">No category image selected</span>
                  </div>
                )}

                {/* Upload Button + URL Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="btn btn-outline btn-sm w-full flex items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden text-xs py-2 bg-white">
                    <Upload size={14} className="text-[#B91C1C]" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleImageUpload}
                    />
                  </label>

                  <input
                    type="url"
                    value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                    placeholder="Or paste image URL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg w-full text-xs font-semibold text-[#1C1917]">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C]"
                    />
                    <span>Active in Store</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline btn-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm text-xs"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingCategory
                    ? 'Update Category'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-red-600 flex items-center gap-2">
                <Trash2 size={18} /> Delete Category
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-[#A8A29E] hover:text-[#1C1917]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#57534E]">
              <p>
                Are you sure you want to delete category{' '}
                <strong className="text-[#1C1917]">"{deleteTarget.name}"</strong>?
              </p>

              {getProductCount(deleteTarget) > 0 ? (
                <div className="space-y-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2 text-amber-900 font-semibold text-xs">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {getProductCount(deleteTarget)} product(s) currently belong to this category.
                    </span>
                  </div>

                  <p className="text-[11px] text-[#78716C]">
                    Choose what to do with the attached products:
                  </p>

                  <div className="space-y-2">
                    {otherCategoriesForReassign.length > 0 && (
                      <label className="flex items-start gap-2 p-2.5 bg-white border border-[#E7E0D8] rounded-lg cursor-pointer">
                        <input
                          type="radio"
                          name="deleteMode"
                          value="reassign"
                          checked={deleteMode === 'reassign'}
                          onChange={() => setDeleteMode('reassign')}
                          className="mt-0.5 text-[#B91C1C] focus:ring-[#B91C1C]"
                        />
                        <div className="space-y-1.5 flex-1">
                          <span className="font-bold text-[#1C1917] block">
                            Reassign products to another category
                          </span>
                          {deleteMode === 'reassign' && (
                            <select
                              value={reassignTargetId}
                              onChange={(e) => setReassignTargetId(e.target.value)}
                              className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15"
                            >
                              {otherCategoriesForReassign.map((c) => (
                                <option key={c.id} value={c.id} className="text-[#1C1917] bg-white">
                                  {c.name} (/{c.slug})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    )}

                    <label className="flex items-start gap-2 p-2.5 bg-white border border-[#E7E0D8] rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="delete_all"
                        checked={deleteMode === 'delete_all' || otherCategoriesForReassign.length === 0}
                        onChange={() => setDeleteMode('delete_all')}
                        className="mt-0.5 text-red-600 focus:ring-red-600"
                      />
                      <div>
                        <span className="font-bold text-red-700 block">
                          Delete category and all its attached products
                        </span>
                        <span className="text-[11px] text-[#78716C]">
                          Permanently removes both the category and its dishes.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-[11px]">
                  ✓ This category has no assigned products and will be removed immediately.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="btn btn-primary bg-red-600 hover:bg-red-700 btn-sm text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Adjust Modal */}
      {bulkPriceModalCat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                    Bulk Adjust Prices
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Category: <span className="font-bold text-[#1C1917]">{bulkPriceModalCat.name}</span> ({getProductCount(bulkPriceModalCat)} dishes)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkPriceModalCat(null)}
                className="p-1 text-[#A8A29E] hover:text-[#1C1917]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleBulkPriceAdjust()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                  Adjustment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDirection('increase')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      adjustDirection === 'increase'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-[#57534E] border-[#E7E0D8]'
                    }`}
                  >
                    📈 Increase (+ Price)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDirection('decrease')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      adjustDirection === 'decrease'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-[#57534E] border-[#E7E0D8]'
                    }`}
                  >
                    📉 Discount (- Price)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('flat')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      adjustType === 'flat'
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-white text-[#57534E] border-[#E7E0D8]'
                    }`}
                  >
                    ₹ Flat Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('percent')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      adjustType === 'percent'
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-white text-[#57534E] border-[#E7E0D8]'
                    }`}
                  >
                    % Percentage
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  {adjustType === 'flat' ? 'Amount in ₹' : 'Percentage %'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={adjustType === 'percent' ? 100 : 1000}
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  required
                  className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15"
                  placeholder={adjustType === 'flat' ? 'e.g. 20' : 'e.g. 10'}
                />
                <p className="text-[11px] text-[#78716C] mt-1.5">
                  Example: {adjustDirection === 'increase' ? '+' : '-'}{adjustType === 'flat' ? `₹${adjustDelta}` : `${adjustDelta}%`} will be applied to all {getProductCount(bulkPriceModalCat)} items in {bulkPriceModalCat.name}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setBulkPriceModalCat(null)}
                  className="btn btn-outline btn-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingPrices}
                  className="btn btn-primary btn-sm text-xs"
                >
                  {isAdjustingPrices ? 'Applying...' : 'Apply Price Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
