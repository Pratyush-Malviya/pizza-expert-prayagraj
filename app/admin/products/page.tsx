'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { Plus, Edit2, Search, X } from 'lucide-react'
import { toast } from 'sonner'

const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'Margherita Pizza', category: 'Pizzas', price: 249, is_veg: true, is_spicy: false, is_available: true },
  { id: 'p2', name: 'Paneer Tikka Pizza', category: 'Pizzas', price: 349, is_veg: true, is_spicy: true, is_available: true },
  { id: 'p3', name: 'Chicken Supreme Pizza', category: 'Pizzas', price: 399, is_veg: false, is_spicy: false, is_available: true },
  { id: 'p4', name: 'Veg Crispy Burger', category: 'Burgers', price: 149, is_veg: true, is_spicy: false, is_available: true },
  { id: 'p5', name: 'Chicken Zinger Burger', category: 'Burgers', price: 199, is_veg: false, is_spicy: true, is_available: true },
  { id: 'p6', name: 'Peri Peri Fries', category: 'Sides', price: 119, is_veg: true, is_spicy: true, is_available: true },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Pizzas',
    price: 299,
    is_veg: true,
    is_spicy: false,
  })

  const toggleAvailability = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_available: !p.is_available } : p))
    )
    toast.success('Updated product availability')
  }

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name) return

    const created = {
      id: 'p-' + Date.now(),
      ...newProduct,
      is_available: true,
    }

    setProducts([created, ...products])
    setShowAddModal(false)
    setNewProduct({ name: '', category: 'Pizzas', price: 299, is_veg: true, is_spicy: false })
    toast.success(`Added product "${created.name}"`)
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
            Menu Products Management
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Add, edit, or toggle availability of menu items.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Add New Product
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-[#E7E0D8] shadow-xs">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or category..."
            className="input-field pl-10 pr-3 py-2 text-xs sm:text-sm bg-[#FBF9F5]"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-[10px] text-[#A8A29E] font-bold uppercase bg-[#FBF9F5] border-b border-[#E7E0D8]">
                <th className="py-3.5 pl-5">Product Name</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Price</th>
                <th className="py-3.5">Badges</th>
                <th className="py-3.5">Availability</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]/60">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#FBF9F5] transition-colors">
                  <td className="py-3.5 pl-5 font-serif font-bold text-[#1C1917]">{prod.name}</td>
                  <td className="py-3.5 text-[#57534E] font-semibold">{prod.category}</td>
                  <td className="py-3.5 font-mono font-bold text-[#B91C1C]">{formatPrice(prod.price)}</td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`badge ${prod.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
                        {prod.is_veg ? 'Veg' : 'Non-Veg'}
                      </span>
                      {prod.is_spicy && <span className="badge badge-spicy">Spicy</span>}
                    </div>
                  </td>
                  <td className="py-3.5">
                    <button
                      onClick={() => toggleAvailability(prod.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        prod.is_available ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/20' : 'bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/20'
                      }`}
                    >
                      {prod.is_available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="py-3.5 pr-5 text-right space-x-2">
                    <button
                      onClick={() => toast.info(`Editing ${prod.name}...`)}
                      className="p-1.5 text-[#57534E] hover:text-[#1C1917] transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. Cheese Burst Pizza"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="input-field bg-[#FBF9F5]"
                  >
                    <option value="Pizzas">Pizzas</option>
                    <option value="Burgers">Burgers</option>
                    <option value="Pasta">Pasta</option>
                    <option value="Sides">Sides</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProduct.is_veg}
                    onChange={(e) => setNewProduct({ ...newProduct, is_veg: e.target.checked })}
                    className="accent-[#B91C1C]"
                  />
                  Pure Veg
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProduct.is_spicy}
                    onChange={(e) => setNewProduct({ ...newProduct, is_spicy: e.target.checked })}
                    className="accent-[#B91C1C]"
                  />
                  Spicy
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-full py-2.5 mt-4">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
