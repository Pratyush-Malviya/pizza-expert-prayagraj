'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import {
  CheckCircle2,
  Edit2,
  Eye,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { saveUploadedImageToHistory } from '@/lib/utils/mediaLibrary'

interface CategoryOption {
  id: string
  name: string
  slug: string
  image_url?: string | null
  is_active: boolean
  sort_order: number
}

interface RemoteCategory {
  id: string
  name: string
  slug: string
  image_url?: string | null
  is_active: boolean
  sort_order: number
}

interface RemoteProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: number | string
  is_veg: boolean
  is_spicy: boolean
  is_available: boolean
  category_id: string
  sort_order: number | null
}

interface RemoteProductImage {
  product_id: string
  image_url: string
  sort_order: number
}

export interface Product {
  id: string
  name: string
  slug: string
  category_id: string
  category: string
  price: number
  description: string
  image_url: string
  is_veg: boolean
  is_spicy: boolean
  is_bestseller: boolean
  is_available: boolean
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600'

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'cat-pizzas', name: 'Pizzas', slug: 'pizzas', is_active: true, sort_order: 1 },
  { id: 'cat-burgers', name: 'Burgers', slug: 'burgers', is_active: true, sort_order: 2 },
  { id: 'cat-pasta', name: 'Pasta', slug: 'pasta', is_active: true, sort_order: 3 },
  { id: 'cat-sandwiches', name: 'Sandwiches', slug: 'sandwiches', is_active: true, sort_order: 4 },
  { id: 'cat-sides', name: 'Sides', slug: 'sides', is_active: true, sort_order: 5 },
  { id: 'cat-beverages', name: 'Beverages', slug: 'beverages', is_active: true, sort_order: 6 },
  { id: 'cat-combos', name: 'Combos', slug: 'combos', is_active: true, sort_order: 7 },
  { id: 'cat-desserts', name: 'Desserts', slug: 'desserts', is_active: true, sort_order: 8 },
]

const INITIAL_PRODUCTS: Product[] = [
  // Pizzas
  { id: 'p1', slug: 'margherita-pizza', name: 'Margherita Pizza', category_id: 'cat-pizzas', category: 'Pizzas', price: 249, description: 'Classic margherita with rich tomato sauce, fresh mozzarella, and aromatic basil leaves.', image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: true, is_available: true },
  { id: 'p2', slug: 'paneer-tikka-pizza', name: 'Paneer Tikka Pizza', category_id: 'cat-pizzas', category: 'Pizzas', price: 349, description: 'Marinated paneer, capsicum, onion, and spicy tikka sauce on a cheesy base.', image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: true, is_bestseller: true, is_available: true },
  { id: 'p3', slug: 'chicken-supreme-pizza', name: 'Chicken Supreme Pizza', category_id: 'cat-pizzas', category: 'Pizzas', price: 399, description: 'Loaded with tender chicken, mushrooms, olives, capsicum, and house pizza sauce.', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80', is_veg: false, is_spicy: false, is_bestseller: false, is_available: true },
  { id: 'p4', slug: 'farm-house-pizza', name: 'Farm House Pizza', category_id: 'cat-pizzas', category: 'Pizzas', price: 299, description: 'Fresh vegetables including capsicum, onion, tomato, and golden corn on a cheesy base.', image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: false, is_available: true },
  { id: 'p5', slug: 'peri-peri-chicken-pizza', name: 'Peri Peri Chicken Pizza', category_id: 'cat-pizzas', category: 'Pizzas', price: 429, description: 'Spicy peri peri marinated chicken with signature sauce, jalapeños, and extra cheese.', image_url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80', is_veg: false, is_spicy: true, is_bestseller: false, is_available: true },

  // Burgers
  { id: 'p6', slug: 'veg-crispy-burger', name: 'Veg Crispy Burger', category_id: 'cat-burgers', category: 'Burgers', price: 149, description: 'Crispy breaded veggie patty with lettuce, tomato, cheese, and special burger sauce.', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: false, is_available: true },
  { id: 'p7', slug: 'chicken-zinger-burger', name: 'Chicken Zinger Burger', category_id: 'cat-burgers', category: 'Burgers', price: 199, description: 'Juicy fried chicken fillet with coleslaw, pickles, and spicy chipotle mayo in a toasted bun.', image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80', is_veg: false, is_spicy: true, is_bestseller: true, is_available: true },
  { id: 'p8', slug: 'double-chicken-patty-burger', name: 'Double Chicken Patty Burger', category_id: 'cat-burgers', category: 'Burgers', price: 259, description: 'Two juicy chicken patties, double cheese, lettuce, and smoky BBQ sauce.', image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', is_veg: false, is_spicy: false, is_bestseller: false, is_available: true },

  // Pasta
  { id: 'p9', slug: 'penne-arrabiata', name: 'Penne Arrabiata', category_id: 'cat-pasta', category: 'Pasta', price: 199, description: 'Classic Italian-style penne in a spicy tomato sauce with garlic, chili, and fresh herbs.', image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: true, is_bestseller: false, is_available: true },
  { id: 'p10', slug: 'chicken-alfredo-pasta', name: 'Chicken Alfredo Pasta', category_id: 'cat-pasta', category: 'Pasta', price: 249, description: 'Creamy white sauce pasta with grilled chicken strips, mushrooms, and Parmesan cheese.', image_url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80', is_veg: false, is_spicy: false, is_bestseller: false, is_available: true },

  // Sides
  { id: 'p11', slug: 'garlic-bread', name: 'Garlic Bread', category_id: 'cat-sides', category: 'Sides', price: 99, description: 'Toasted bread with garlic butter and herbs. The perfect pizza companion.', image_url: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: false, is_available: true },
  { id: 'p12', slug: 'french-fries', name: 'French Fries', category_id: 'cat-sides', category: 'Sides', price: 99, description: 'Crispy golden fries seasoned with our signature spice blend.', image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: false, is_available: true },
  { id: 'p13', slug: 'peri-peri-fries', name: 'Peri Peri Fries', category_id: 'cat-sides', category: 'Sides', price: 119, description: 'Crispy fries tossed in our spicy peri peri seasoning blend.', image_url: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: true, is_bestseller: false, is_available: true },

  // Beverages
  { id: 'p14', slug: 'coca-cola-330ml', name: 'Coca-Cola (330ml)', category_id: 'cat-beverages', category: 'Beverages', price: 60, description: 'Ice-cold Coca-Cola, the perfect pairing for your pizza.', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: false, is_available: true },
  { id: 'p15', slug: 'mango-lassi', name: 'Mango Lassi', category_id: 'cat-beverages', category: 'Beverages', price: 89, description: 'Creamy, chilled mango lassi made with fresh yogurt and real mangoes.', image_url: 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: false, is_available: true },

  // Combos
  { id: 'p16', slug: 'family-feast-combo', name: 'Family Feast Combo', category_id: 'cat-combos', category: 'Combos', price: 899, description: '2 Large Pizzas + Garlic Bread + 4 Coca-Colas. Perfect for family gatherings!', image_url: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=800&q=80', is_veg: true, is_spicy: false, is_bestseller: true, is_available: true },
  { id: 'p17', slug: 'burger-meal-combo', name: 'Burger Meal Combo', category_id: 'cat-combos', category: 'Combos', price: 329, description: '1 Chicken Zinger Burger + Peri Peri Fries + Coca-Cola. A complete meal!', image_url: 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=800&q=80', is_veg: false, is_spicy: true, is_bestseller: false, is_available: true },
]

const emptyProductForm = (category: CategoryOption): Omit<Product, 'id'> => ({
  name: '',
  slug: '',
  category_id: category.id,
  category: category.name,
  price: 299,
  description: '',
  image_url: DEFAULT_IMAGE,
  is_veg: true,
  is_spicy: false,
  is_bestseller: false,
  is_available: true,
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('')
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProductForm(DEFAULT_CATEGORIES[0]))
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTarget, setMediaTarget] = useState<'product' | 'category'>('product')

  const categoryNames = useMemo(() => ['All', ...categories.map((category) => category.name)], [categories])

  const persistProducts = useCallback((updated: Product[]) => {
    setProducts(updated)
    localStorage.setItem('pizza_products', JSON.stringify(updated))
  }, [])

  const persistCategories = useCallback((updated: CategoryOption[]) => {
    setCategories(updated)
    localStorage.setItem('pizza_categories', JSON.stringify(updated))
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const storedCategoriesRaw = localStorage.getItem('pizza_categories')
      let localCategories: CategoryOption[] = []
      if (storedCategoriesRaw) {
        try {
          const parsed = JSON.parse(storedCategoriesRaw)
          if (Array.isArray(parsed)) localCategories = parsed
        } catch {}
      } else {
        localCategories = DEFAULT_CATEGORIES
        localStorage.setItem('pizza_categories', JSON.stringify(DEFAULT_CATEGORIES))
      }
      setCategories(localCategories)

      const storedProductsRaw = localStorage.getItem('pizza_products')
      let localProducts: Product[] = []
      if (storedProductsRaw) {
        try {
          const parsedProds = JSON.parse(storedProductsRaw)
          if (Array.isArray(parsedProds)) localProducts = parsedProds
        } catch {}
      } else {
        localProducts = INITIAL_PRODUCTS
        localStorage.setItem('pizza_products', JSON.stringify(INITIAL_PRODUCTS))
      }
      setProducts(localProducts)

      const supabase = createClient()
      const { data: remoteCategories, error: categoryError } = await supabase
        .from('categories')
        .select('id,name,slug,is_active,sort_order')
        .order('sort_order', { ascending: true })

      if (!categoryError && remoteCategories?.length) {
        const mappedCategories = (remoteCategories as RemoteCategory[]).map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          is_active: Boolean(category.is_active),
          sort_order: Number(category.sort_order) || 0,
        }))
        setCategories(mappedCategories)
        localStorage.setItem('pizza_categories', JSON.stringify(mappedCategories))

        const { data: remoteProducts, error: productError } = await supabase
          .from('products')
          .select('id,name,slug,description,price,is_veg,is_spicy,is_available,category_id,sort_order,created_at')
          .order('created_at', { ascending: false })

        const { data: remoteImages } = await supabase
          .from('product_images')
          .select('product_id,image_url,sort_order')
          .order('sort_order', { ascending: true })

        if (!productError && remoteProducts?.length) {
          const mappedProducts = (remoteProducts as RemoteProduct[]).map((product) => {
            const category = mappedCategories.find((item) => item.id === product.category_id)
            const image = (remoteImages as RemoteProductImage[] | null)?.find((item) => item.product_id === product.id)
            return {
              id: product.id,
              name: product.name,
              slug: product.slug,
              category_id: product.category_id,
              category: category?.name || 'Uncategorized',
              price: Number(product.price) || 0,
              description: product.description || '',
              image_url: image?.image_url || DEFAULT_IMAGE,
              is_veg: Boolean(product.is_veg),
              is_spicy: Boolean(product.is_spicy),
              is_bestseller: Number(product.sort_order) === 1,
              is_available: Boolean(product.is_available),
            }
          })
          persistProducts(mappedProducts)
        }
      }
    } catch (error) {
      console.warn('Products fetch note:', error)
    } finally {
      setLoading(false)
    }
  }, [persistProducts])

  useEffect(() => {
    void Promise.resolve().then(fetchProducts)
  }, [fetchProducts])

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase()
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })

  const updateFormCategory = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId) || categories[0]
    setFormData({ ...formData, category_id: category.id, category: category.name })
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormData(emptyProductForm(categories[0] || DEFAULT_CATEGORIES[0]))
    setShowProductModal(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      slug: product.slug,
      category_id: product.category_id,
      category: product.category,
      price: product.price,
      description: product.description,
      image_url: product.image_url,
      is_veg: product.is_veg,
      is_spicy: product.is_spicy,
      is_bestseller: product.is_bestseller,
      is_available: product.is_available,
    })
    setShowProductModal(true)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Product image must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setFormData({ ...formData, image_url: result })
      saveUploadedImageToHistory(result, formData.name || 'Product Image')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProduct = async (event: React.FormEvent) => {
    event.preventDefault()

    const name = formData.name.trim()
    if (!name) {
      toast.error('Product name is required')
      return
    }

    const slug = slugify(formData.slug || name)
    if (!slug) {
      toast.error('Product slug is required')
      return
    }

    const duplicate = products.find((product) => product.slug === slug && product.id !== editingProduct?.id)
    if (duplicate) {
      toast.error('Another product already uses this slug')
      return
    }

    const productPayload = {
      name,
      slug,
      description: formData.description.trim(),
      price: Number(formData.price) || 0,
      is_veg: formData.is_veg,
      is_spicy: formData.is_spicy,
      is_available: formData.is_available,
      category_id: formData.category_id,
      sort_order: formData.is_bestseller ? 1 : 10,
    }

    let productId = editingProduct?.id || `p-${Date.now()}`

    try {
      const supabase = createClient()
      if (editingProduct) {
        await supabase.from('products').update(productPayload).eq('id', editingProduct.id)
        await supabase.from('product_images').delete().eq('product_id', editingProduct.id)
      } else {
        const { data } = await supabase.from('products').insert(productPayload).select('id').single()
        if (data?.id) productId = data.id
      }

      if (formData.image_url.trim()) {
        await supabase.from('product_images').insert({
          product_id: productId,
          image_url: formData.image_url.trim(),
          sort_order: 1,
        })
      }
    } catch (error) {
      console.warn('Product save note:', error)
    }

    const nextProduct: Product = {
      id: productId,
      ...formData,
      name,
      slug,
      price: Number(formData.price) || 0,
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
    }

    const updatedProducts = editingProduct
      ? products.map((product) => (product.id === editingProduct.id ? nextProduct : product))
      : [nextProduct, ...products]

    persistProducts(updatedProducts)
    setShowProductModal(false)
    setEditingProduct(null)
    toast.success(editingProduct ? 'Product updated' : 'Product created')
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Delete "${product.name}" from product management?`)) return

    persistProducts(products.filter((item) => item.id !== product.id))
    try {
      const supabase = createClient()
      await supabase.from('product_images').delete().eq('product_id', product.id)
      await supabase.from('products').delete().eq('id', product.id)
    } catch (error) {
      console.warn('Product delete note:', error)
    }

    toast.success('Product deleted')
  }

  const toggleAvailability = async (product: Product) => {
    const nextState = !product.is_available
    persistProducts(products.map((item) => (item.id === product.id ? { ...item, is_available: nextState } : item)))

    try {
      const supabase = createClient()
      await supabase.from('products').update({ is_available: nextState }).eq('id', product.id)
    } catch {}

    toast.success(`${product.name} is now ${nextState ? 'in stock' : 'out of stock'}`)
  }

  const handleNewCategoryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Category image must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setNewCategoryImageUrl(result)
      saveUploadedImageToHistory(result, newCategoryInput || 'Category Image')
      toast.success('Category image uploaded')
    }
    reader.readAsDataURL(file)
  }

  const handleAddCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = newCategoryInput.trim()
    const slug = slugify(name)

    if (!name || !slug) return
    if (categories.some((category) => category.slug === slug || category.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists')
      return
    }

    let category: CategoryOption = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      image_url: newCategoryImageUrl.trim() || null,
      is_active: true,
      sort_order: categories.length + 1,
    }

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('categories')
        .insert({ name, slug, image_url: category.image_url, is_active: true, sort_order: category.sort_order })
        .select('id,name,slug,image_url,is_active,sort_order')
        .single()
      if (data) {
        category = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          image_url: data.image_url ?? category.image_url,
          is_active: Boolean(data.is_active),
          sort_order: Number(data.sort_order) || category.sort_order,
        }
      }
    } catch (error) {
      console.warn('Category save note:', error)
    }

    persistCategories([...categories, category])
    setSelectedCategory(category.name)
    setNewCategoryInput('')
    setNewCategoryImageUrl('')
    setShowCategoryModal(false)
    toast.success('Category created')
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">Product Management</h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Manage products, categories, images, stock, badges, pricing, and previews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/categories" className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs">
            <Layers size={15} /> Manage Categories
          </Link>
          <button onClick={() => setShowCategoryModal(true)} className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs">
            <FolderPlus size={15} /> Add Category
          </button>
          <button onClick={openCreateModal} className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4">
          <p className="text-[11px] uppercase font-bold text-[#A8A29E]">Products</p>
          <p className="text-2xl font-serif font-bold text-[#1C1917]">{products.length}</p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4">
          <p className="text-[11px] uppercase font-bold text-[#A8A29E]">Categories</p>
          <p className="text-2xl font-serif font-bold text-[#1C1917]">{categories.length}</p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4">
          <p className="text-[11px] uppercase font-bold text-[#A8A29E]">In Stock</p>
          <p className="text-2xl font-serif font-bold text-[#15803D]">{products.filter((product) => product.is_available).length}</p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4">
          <p className="text-[11px] uppercase font-bold text-[#A8A29E]">Hidden</p>
          <p className="text-2xl font-serif font-bold text-[#B91C1C]">{products.filter((product) => !product.is_available).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#E7E0D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categoryNames.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-[#B91C1C] text-white shadow-xs'
                  : 'bg-[#FBF9F5] text-[#57534E] hover:bg-[#E7E0D8] border border-[#E7E0D8]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product name, description, or category..."
            className="input-field pl-10 pr-3 py-2 text-xs sm:text-sm bg-[#FBF9F5]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E7E0D8] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
            {loading ? 'Loading products...' : `${filteredProducts.length} shown`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-[10px] text-[#A8A29E] font-bold uppercase bg-[#FBF9F5] border-b border-[#E7E0D8]">
                <th className="py-3.5 pl-5">Product</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Price</th>
                <th className="py-3.5">Details</th>
                <th className="py-3.5">Stock</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]/60">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[#FBF9F5] transition-colors">
                  <td className="py-3.5 pl-5">
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <div className="relative w-12 h-12 rounded-lg bg-[#FBF9F5] border border-[#E7E0D8] overflow-hidden shrink-0">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill sizes="48px" className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#A8A29E]">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif font-bold text-[#1C1917] line-clamp-1">{product.name}</p>
                        <p className="text-[11px] text-[#A8A29E] line-clamp-1">{product.description || product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-[#57534E] font-semibold">{product.category}</td>
                  <td className="py-3.5 font-mono font-bold text-[#B91C1C]">{formatPrice(product.price)}</td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>{product.is_veg ? 'Veg' : 'Non-Veg'}</span>
                      {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
                      {product.is_bestseller && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={10} /> Bestseller
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5">
                    <button
                      onClick={() => toggleAvailability(product)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 transition-all ${
                        product.is_available
                          ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/20'
                          : 'bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/20'
                      }`}
                    >
                      {product.is_available ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {product.is_available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="py-3.5 pr-5 text-right whitespace-nowrap">
                    <button onClick={() => setPreviewProduct(product)} title="Preview" className="p-1.5 text-[#57534E] hover:text-[#B91C1C] hover:bg-[#FBF9F5] rounded transition-colors">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => openEditModal(product)} title="Edit" className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FBF9F5] rounded transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDeleteProduct(product)} title="Delete" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#A8A29E] text-sm">
                    No products found. Add a product or adjust the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowProductModal(false)} className="p-1 text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="grid lg:grid-cols-[1fr_220px] gap-5">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Product Name</label>
                    <input
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value, slug: slugify(event.target.value) })}
                      className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">URL Slug</label>
                    <input
                      value={formData.slug}
                      onChange={(event) => setFormData({ ...formData, slug: slugify(event.target.value) })}
                      className="w-full bg-[#FBF9F5] border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(event) => updateFormCategory(event.target.value)}
                      className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs cursor-pointer"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id} className="text-[#1C1917] bg-white py-1">
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Price (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.price}
                      onChange={(event) => setFormData({ ...formData, price: Number(event.target.value) })}
                      className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Product Image URL</label>
                  <input
                    value={formData.image_url}
                    onChange={(event) => setFormData({ ...formData, image_url: event.target.value })}
                    className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg text-xs font-semibold text-[#1C1917]">
                    Vegetarian
                    <input type="checkbox" checked={formData.is_veg} onChange={(event) => setFormData({ ...formData, is_veg: event.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg text-xs font-semibold text-[#1C1917]">
                    Spicy
                    <input type="checkbox" checked={formData.is_spicy} onChange={(event) => setFormData({ ...formData, is_spicy: event.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg text-xs font-semibold text-[#1C1917]">
                    Bestseller
                    <input type="checkbox" checked={formData.is_bestseller} onChange={(event) => setFormData({ ...formData, is_bestseller: event.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg text-xs font-semibold text-[#1C1917]">
                    Available
                    <input type="checkbox" checked={formData.is_available} onChange={(event) => setFormData({ ...formData, is_available: event.target.checked })} />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative aspect-square rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] overflow-hidden flex items-center justify-center">
                  {formData.image_url ? (
                    <Image src={formData.image_url} alt="Product preview" width={220} height={220} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <ImageIcon size={28} className="text-[#A8A29E]" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMediaTarget('product'); setMediaModalOpen(true) }}
                    className="btn btn-outline btn-sm justify-center flex items-center gap-1.5 text-xs bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                  >
                    <ImageIcon size={14} /> From Library
                  </button>
                  <label className="btn btn-outline btn-sm justify-center flex items-center gap-1.5 cursor-pointer relative overflow-hidden text-xs bg-white">
                    <Upload size={14} /> Upload
                    <input type="file" accept="image/png, image/jpeg, image/webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                  </label>
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, image_url: '' })} className="btn btn-outline btn-sm w-full text-xs text-[#78716C]">
                  Remove Image
                </button>
                <div className="pt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-outline btn-sm text-xs">Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm text-xs">{editingProduct ? 'Update Product' : 'Create Product'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">Create Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Category Name</label>
                <input
                  value={newCategoryInput}
                  onChange={(event) => setNewCategoryInput(event.target.value)}
                  className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                  placeholder="e.g. Combos"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1C1917]">
                  Category Banner / Image
                </label>

                {newCategoryImageUrl ? (
                  <div className="relative h-24 rounded-xl border border-[#E7E0D8] overflow-hidden bg-[#FBF9F5]">
                    <Image
                      src={newCategoryImageUrl}
                      alt="Category preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => setNewCategoryImageUrl('')}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs transition-colors shadow-xs"
                      title="Remove Image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 rounded-xl border border-dashed border-[#E7E0D8] bg-[#FBF9F5] flex flex-col items-center justify-center text-[#A8A29E] gap-1">
                    <ImageIcon size={18} />
                    <span className="text-[10px]">No image selected</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMediaTarget('category'); setMediaModalOpen(true) }}
                    className="btn btn-outline btn-sm w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                  >
                    <ImageIcon size={13} />
                    <span>From Library</span>
                  </button>
                  <label className="btn btn-outline btn-sm w-full flex items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden text-xs py-2 bg-white">
                    <Upload size={13} className="text-[#B91C1C]" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleNewCategoryImageUpload}
                    />
                  </label>
                </div>
                <input
                  type="url"
                  value={newCategoryImageUrl.startsWith('data:') ? '' : newCategoryImageUrl}
                  onChange={(e) => setNewCategoryImageUrl(e.target.value)}
                  className="w-full bg-white border border-[#E7E0D8] text-[#1C1917] placeholder:text-[#A8A29E] text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15 transition-all shadow-xs"
                  placeholder="Or paste image URL"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-outline btn-sm text-xs">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm text-xs">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-[#E7E0D8] relative">
            <button onClick={() => setPreviewProduct(null)} className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black transition-colors">
              <X size={16} />
            </button>
            <div className="relative h-48 bg-[#FBF9F5]">
              {previewProduct.image_url ? (
                <Image src={previewProduct.image_url} alt={previewProduct.name} fill sizes="384px" className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#A8A29E]">No image</div>
              )}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-serif font-bold text-lg text-[#1C1917]">{previewProduct.name}</h4>
                <span className="font-mono font-bold text-[#B91C1C] text-lg">{formatPrice(previewProduct.price)}</span>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">{previewProduct.description || 'No description added.'}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`badge ${previewProduct.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>{previewProduct.is_veg ? 'Veg' : 'Non-Veg'}</span>
                {previewProduct.is_spicy && <span className="badge badge-spicy">Spicy</span>}
                {previewProduct.is_bestseller && <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Bestseller</span>}
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-[#E7E0D8]">
                <span className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider">{previewProduct.category}</span>
                <button disabled className="btn btn-primary btn-sm text-xs cursor-default">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        currentImage={mediaTarget === 'product' ? formData.image_url : newCategoryImageUrl}
        title={mediaTarget === 'product' ? 'Select Product Image' : 'Select Category Banner Image'}
        onSelect={(url) => {
          if (mediaTarget === 'product') {
            setFormData({ ...formData, image_url: url })
          } else {
            setNewCategoryImageUrl(url)
          }
        }}
      />
    </div>
  )
}
